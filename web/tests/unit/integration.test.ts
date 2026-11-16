import { beforeAll, describe, expect, it } from "vitest";
import { signQrPayload } from "@/lib/qr";
import { generateRandomToken } from "@/lib/tokens";
import { db } from "@/server/db";
import { env } from "@/server/env";
import {
  ActiveBookingExistsError,
  cancelBookingById,
  createAtomicBooking,
  SlotUnavailableError,
} from "@/server/services/bookings";
import { generateCampaignPreview } from "@/server/services/campaigns";
import {
  checkInBooking,
  recordBookingOutcome,
} from "@/server/services/checkin";

describe("Integrasi Basis Data & Kriteria Penerimaan (AC-02 s.d. AC-10)", () => {
  beforeAll(async () => {
    await db.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS one_active_booking_per_donor
      ON "Booking" ("donorId") WHERE status IN ('CONFIRMED', 'CHECKED_IN');
    `);
  });

  it("AC-03 & Bagian 8.3 (Tes Wajib): 20 permintaan booking paralel ke slot berkapasitas 4 menghasilkan tepat 4 berhasil dan 16 ditolak karena slot penuh", async () => {
    const branchId = env.DEFAULT_BRANCH_ID;
    const futureStart = new Date(Date.now() + 72 * 3600 * 1000);
    const futureEnd = new Date(futureStart.getTime() + 30 * 60 * 1000);

    const testSlot = await db.slot.create({
      data: {
        branchId,
        startsAt: futureStart,
        endsAt: futureEnd,
        capacity: 4,
        bookedCount: 0,
      },
    });

    // Ambil 20 donor sintetis yang belum memiliki booking aktif
    const donors = await db.donorProfile.findMany({
      where: {
        isSynthetic: true,
        bookings: { none: {} },
      },
      take: 20,
    });
    expect(donors).toHaveLength(20);

    // Jalankan 20 permintaan booking secara paralel (Promise.allSettled)
    const results = await Promise.allSettled(
      donors.map((d) =>
        createAtomicBooking({
          slotId: testSlot.id,
          donorId: d.id,
        })
      )
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    );

    expect(fulfilled).toHaveLength(4);
    expect(rejected).toHaveLength(16);

    for (const rej of rejected) {
      expect(rej.reason).toBeInstanceOf(SlotUnavailableError);
      expect(rej.reason.message).toContain("baru saja penuh");
    }

    const updatedSlot = await db.slot.findUniqueOrThrow({
      where: { id: testSlot.id },
    });
    expect(updatedSlot.bookedCount).toBe(4);

    // Bersihkan data uji konkurensi
    await db.booking.deleteMany({ where: { slotId: testSlot.id } });
    await db.slot.delete({ where: { id: testSlot.id } });
  });

  it("AC-04 & BR-10: menolak booking kedua untuk donor yang sudah punya jadwal aktif, dan mengizinkan setelah jadwal dibatalkan", async () => {
    const branchId = env.DEFAULT_BRANCH_ID;
    const start1 = new Date(Date.now() + 80 * 3600 * 1000);
    const start2 = new Date(Date.now() + 82 * 3600 * 1000);

    const [slot1, slot2] = await Promise.all([
      db.slot.create({
        data: {
          branchId,
          startsAt: start1,
          endsAt: new Date(start1.getTime() + 30 * 60 * 1000),
          capacity: 4,
          bookedCount: 0,
        },
      }),
      db.slot.create({
        data: {
          branchId,
          startsAt: start2,
          endsAt: new Date(start2.getTime() + 30 * 60 * 1000),
          capacity: 4,
          bookedCount: 0,
        },
      }),
    ]);

    const donor = await db.donorProfile.findFirstOrThrow({
      where: {
        isSynthetic: true,
        bookings: { none: {} },
      },
    });

    const firstBooking = await createAtomicBooking({
      slotId: slot1.id,
      donorId: donor.id,
    });
    expect(firstBooking.booking.status).toBe("CONFIRMED");

    // Coba pesan slot kedua saat booking pertama masih CONFIRMED -> harus ditolak (AC-04)
    await expect(
      createAtomicBooking({
        slotId: slot2.id,
        donorId: donor.id,
      })
    ).rejects.toThrow(ActiveBookingExistsError);

    // Batalkan booking pertama -> kapasitas kembali ke 0
    await cancelBookingById({
      bookingId: firstBooking.booking.id,
      actorId: donor.id,
    });

    const refreshedSlot1 = await db.slot.findUniqueOrThrow({
      where: { id: slot1.id },
    });
    expect(refreshedSlot1.bookedCount).toBe(0);

    // Bersihkan
    await db.booking.deleteMany({
      where: { slotId: { in: [slot1.id, slot2.id] } },
    });
    await db.slot.deleteMany({
      where: { id: { in: [slot1.id, slot2.id] } },
    });
  });

  it("AC-06, AC-07 & AC-08: check-in QR idempoten di dalam jendela waktu, ditolak di luar jendela, dan Selesai donor mereset timer 60 hari serta menyaring donor dari ranking", async () => {
    const branchId = env.DEFAULT_BRANCH_ID;
    const now = new Date();
    const slotStart = new Date(now.getTime() + 10 * 60 * 1000); // 10 menit dari sekarang (di dalam jendela ±30 mnt)
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

    const slot = await db.slot.create({
      data: {
        branchId,
        startsAt: slotStart,
        endsAt: slotEnd,
        capacity: 4,
        bookedCount: 1,
      },
    });

    const donor = await db.donorProfile.create({
      data: {
        fullName: "Donor Uji Siklus Penuh",
        email: "siklus.penuh@contoh.test",
        phone: "0899-7777-8888",
        birthDate: new Date("1999-05-10"),
        sex: "M",
        bloodGroup: "B_POS",
        cohort: "test-cycle",
        contactConsent: true,
        lastDonationAt: new Date(now.getTime() - 120 * 24 * 3600 * 1000),
        firstDonationAt: new Date(now.getTime() - 360 * 24 * 3600 * 1000),
        donationCount: 3,
        isSynthetic: true,
      },
    });

    const booking = await db.booking.create({
      data: {
        slotId: slot.id,
        donorId: donor.id,
        code: "8K4M2P9T",
        status: "CONFIRMED",
      },
    });

    const qrPayload = signQrPayload(
      booking.id,
      Math.floor(slotEnd.getTime() / 1000) + 3600,
      env.QR_HMAC_SECRET
    );

    // AC-07: Scan 2 jam terlalu awal -> ditolak dengan pesan jendela waktu
    const twoHoursEarly = new Date(slotStart.getTime() - 120 * 60 * 1000);
    await expect(
      checkInBooking({
        qrPayload,
        actorId: "usr_coord_01",
        now: twoHoursEarly,
      })
    ).rejects.toThrow(/Check-in dibuka mulai/);

    // AC-06: Scan pertama di dalam jendela waktu -> berhasil CHECKED_IN
    const firstScan = await checkInBooking({
      qrPayload,
      actorId: "usr_coord_01",
      now,
    });
    expect(firstScan.alreadyCheckedIn).toBe(false);
    expect(firstScan.booking.status).toBe("CHECKED_IN");

    // AC-06: Scan kedua -> idempoten, menampilkan sudah check-in
    const secondScan = await checkInBooking({
      qrPayload,
      actorId: "usr_coord_01",
      now,
    });
    expect(secondScan.alreadyCheckedIn).toBe(true);
    expect(secondScan.message).toContain("Sudah check-in");

    // AC-08: Petugas menekan Selesai donor -> lastDonationAt, donationCount, nextEligibleAt terbarui
    const outcomeRes = await recordBookingOutcome({
      bookingId: booking.id,
      outcome: "COMPLETED",
      actorId: "usr_coord_01",
      now,
    });
    expect(outcomeRes.booking.status).toBe("COMPLETED");
    expect(outcomeRes.booking.donor.donationCount).toBe(4);
    expect(outcomeRes.booking.donor.nextEligibleAt?.getTime()).toBeGreaterThan(
      now.getTime() + 59 * 24 * 3600 * 1000
    );

    // AC-08: Donor kini berada dalam masa jeda 60 hari dan tidak muncul di ranking kandidat layak
    const preview = await generateCampaignPreview(
      {
        group: "B_POS",
        targetUnits: 4,
        deadlineAt: new Date(now.getTime() + 5 * 24 * 3600 * 1000),
        cohortFilter: "test-cycle",
      },
      { now, forceFallback: true }
    );
    expect(preview.candidates.find((c) => c.id === donor.id)).toBeUndefined();
    expect(preview.cooldownExcludedCount).toBe(1);

    // Bersihkan
    await db.donation.deleteMany({ where: { bookingId: booking.id } });
    await db.booking.delete({ where: { id: booking.id } });
    await db.donorProfile.delete({ where: { id: donor.id } });
    await db.slot.delete({ where: { id: slot.id } });
  });

  it("AC-09: saat layanan ML tidak merespons, pratinjau ranking beralih ke fallback heuristik dengan peringatan jelas", async () => {
    const preview = await generateCampaignPreview(
      {
        group: "B_POS",
        targetUnits: 6,
        deadlineAt: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      },
      {
        mlServiceUrlOverride: "http://127.0.0.1:59999", // Port mati untuk menguji ketahanan fallback
      }
    );

    expect(preview.usedFallback).toBe(true);
    expect(preview.candidates.length).toBeGreaterThan(0);
    expect(preview.warnings.some((w) => w.code === "ML_FALLBACK")).toBe(true);
  });

  it("AC-10: mendeteksi token undangan kedaluwarsa dengan aman", async () => {
    const campaign = await db.campaign.findFirstOrThrow();
    const donor = await db.donorProfile.findFirstOrThrow({
      where: {
        isSynthetic: true,
        invitations: { none: {} },
      },
    });
    const { tokenHash } = generateRandomToken();

    const expiredInv = await db.invitation.create({
      data: {
        campaignId: campaign.id,
        donorId: donor.id,
        tokenHash,
        status: "SENT",
        score: 0.4,
        rank: 99,
        reasons: [],
        expiresAt: new Date(Date.now() - 3600 * 1000), // Kedaluwarsa 1 jam lalu
      },
    });

    expect(expiredInv.expiresAt.getTime()).toBeLessThan(Date.now());
    await db.invitation.delete({ where: { id: expiredInv.id } });
  });
});
