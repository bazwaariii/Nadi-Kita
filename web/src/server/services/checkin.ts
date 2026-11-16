import {
  normalizeBookingCode,
  verifyQrPayload,
} from "@/lib/qr";
import { db, parseBranchRules } from "@/server/db";
import { env } from "@/server/env";
import { evaluateCheckInWindow } from "@/server/rules/slots";
import { BookingRuleError } from "@/server/services/bookings";

/**
 * BR-11 (AC-06, AC-07): Memverifikasi QR atau kode cadangan 8 karakter dan mencatat check-in.
 * Idempoten: memindai dua kali pada tiket yang sudah CHECKED_IN tidak mengubah data.
 */
export async function checkInBooking(params: {
  qrPayload?: string;
  code?: string;
  actorId: string;
  now?: Date;
}) {
  const now = params.now || new Date();
  let bookingId: string | undefined;
  let normalizedCode: string | undefined;

  if (params.qrPayload && params.qrPayload.trim().startsWith("nk1.")) {
    const verified = verifyQrPayload(
      params.qrPayload,
      env.QR_HMAC_SECRET,
      Math.floor(now.getTime() / 1000)
    );
    if (!verified.valid) {
      const msg =
        verified.reason === "EXPIRED"
          ? "Tanda tangan tiket QR sudah kedaluwarsa. Gunakan kode tiket bila perlu."
          : "Kode QR tidak dikenali atau tanda tangan tidak sah.";
      throw new BookingRuleError("INVALID_QR", msg, 400);
    }
    bookingId = verified.bookingId;
  } else if (params.code || params.qrPayload) {
    normalizedCode = normalizeBookingCode(params.code || params.qrPayload || "");
    if (!normalizedCode) {
      throw new BookingRuleError(
        "EMPTY_CODE",
        "Masukkan kode tiket 8 karakter atau pindai QR.",
        400
      );
    }
  } else {
    throw new BookingRuleError(
      "MISSING_INPUT",
      "Masukkan kode tiket atau pindai QR.",
      400
    );
  }

  const booking = await db.booking.findFirst({
    where: bookingId ? { id: bookingId } : { code: normalizedCode },
    include: {
      donor: true,
      slot: { include: { branch: true } },
    },
  });

  if (!booking) {
    throw new BookingRuleError(
      "BOOKING_NOT_FOUND",
      "Tiket tidak ditemukan. Periksa kembali kode yang dimasukkan.",
      404
    );
  }

  if (booking.status === "CANCELLED") {
    throw new BookingRuleError(
      "BOOKING_CANCELLED",
      "Jadwal ini sudah dibatalkan oleh donor.",
      400
    );
  }

  if (booking.status === "COMPLETED") {
    return {
      booking,
      alreadyCheckedIn: true,
      message: "Donor ini sudah selesai melakukan donor darah hari ini.",
    };
  }

  // Idempoten (BR-11, AC-06): memindai kedua kali tidak mengubah apa pun
  if (booking.status === "CHECKED_IN") {
    return {
      booking,
      alreadyCheckedIn: true,
      message: "Sudah check-in. Donor tercatat hadir di lokasi.",
    };
  }

  const config = parseBranchRules(booking.slot.branch.rules);
  const windowCheck = evaluateCheckInWindow(
    booking.slot.startsAt,
    now,
    config
  );

  if (!windowCheck.valid) {
    throw new BookingRuleError(
      windowCheck.reason === "TOO_EARLY"
        ? "CHECKIN_TOO_EARLY"
        : "CHECKIN_TOO_LATE",
      windowCheck.message || "Di luar jendela waktu check-in.",
      400
    );
  }

  const updated = await db.booking.update({
    where: { id: booking.id },
    data: {
      status: "CHECKED_IN",
      checkedInAt: now,
    },
    include: {
      donor: true,
      slot: { include: { branch: true } },
    },
  });

  await db.eventLog.create({
    data: {
      name: "qr_scanned",
      actorId: params.actorId,
      role: "COORDINATOR",
      entityId: booking.id,
      meta: {
        donorId: booking.donorId,
        slotId: booking.slotId,
        method: bookingId ? "QR" : "CODE",
      },
    },
  });

  return {
    booking: updated,
    alreadyCheckedIn: false,
    message: "Check-in berhasil dicatat.",
  };
}

/**
 * K4 & BR-12 (AC-08): Konfirmasi petugas setelah check-in:
 * - COMPLETED ("Selesai donor"): membuat catatan Donation, mengisi lastDonationAt,
 *   menambah donationCount, menghitung nextEligibleAt = lastDonationAt + cooldownDays,
 *   dan menambah stok golongan darah terkait sebanyak 1 kantong.
 * - DEFERRED ("Ditunda"): mencatat alasan tanpa mereset timer masa jeda 60 hari.
 */
export async function recordBookingOutcome(params: {
  bookingId: string;
  outcome: "COMPLETED" | "DEFERRED";
  note?: string;
  actorId: string;
  now?: Date;
}) {
  const now = params.now || new Date();
  const booking = await db.booking.findUnique({
    where: { id: params.bookingId },
    include: {
      donor: true,
      slot: { include: { branch: true } },
    },
  });

  if (!booking) {
    throw new BookingRuleError(
      "BOOKING_NOT_FOUND",
      "Jadwal tidak ditemukan.",
      404
    );
  }

  if (booking.status === "COMPLETED" || booking.status === "DEFERRED") {
    return {
      booking,
      alreadyRecorded: true,
    };
  }

  if (booking.status !== "CHECKED_IN" && booking.status !== "CONFIRMED") {
    throw new BookingRuleError(
      "INVALID_BOOKING_STATE",
      "Hanya jadwal yang aktif atau sudah hadir yang dapat dikonfirmasi hasilnya.",
      400
    );
  }

  const config = parseBranchRules(booking.slot.branch.rules);
  const cooldownMs = config.cooldownDays * 24 * 60 * 60 * 1000;

  if (params.outcome === "DEFERRED") {
    const deferred = await db.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "DEFERRED",
          completedAt: now,
          outcomeNote:
            params.note || "Ditunda saat pemeriksaan kesehatan di lokasi",
        },
        include: {
          donor: true,
          slot: { include: { branch: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: params.actorId,
          action: "BOOKING_DEFERRED",
          entity: "Booking",
          entityId: booking.id,
          before: { status: booking.status },
          after: { status: "DEFERRED", note: b.outcomeNote },
        },
      });

      await tx.eventLog.create({
        data: {
          name: "outcome_recorded",
          actorId: params.actorId,
          role: "COORDINATOR",
          entityId: booking.id,
          meta: { outcome: "DEFERRED" },
        },
      });

      return b;
    });

    return {
      booking: deferred,
      alreadyRecorded: false,
    };
  }

  // COMPLETED: Selesai donor -> reset timer 60 hari + catat Donation + tambah 1 kantong ke stok
  const nextEligibleAt = new Date(now.getTime() + cooldownMs);

  const completed = await db.$transaction(async (tx) => {
    const b = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "COMPLETED",
        checkedInAt: booking.checkedInAt || now,
        completedAt: now,
        outcomeNote: params.note || "Selesai donor 350 mL",
      },
    });

    await tx.donation.upsert({
      where: { bookingId: booking.id },
      update: {},
      create: {
        donorId: booking.donorId,
        branchId: booking.slot.branchId,
        donatedAt: now,
        volumeMl: 350,
        source: "APP",
        bookingId: booking.id,
      },
    });

    const updatedDonor = await tx.donorProfile.update({
      where: { id: booking.donorId },
      data: {
        firstDonationAt: booking.donor.firstDonationAt || now,
        lastDonationAt: now,
        donationCount: booking.donor.donationCount + 1,
        nextEligibleAt,
      },
    });

    // Tambah 1 kantong pada stok cabang untuk golongan darah donor
    const currentStock = await tx.stockLevel.findUnique({
      where: {
        branchId_group: {
          branchId: booking.slot.branchId,
          group: booking.donor.bloodGroup,
        },
      },
    });

    if (currentStock) {
      await tx.stockLevel.update({
        where: { id: currentStock.id },
        data: {
          units: currentStock.units + 1,
          updatedBy: params.actorId,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: params.actorId,
        action: "DONATION_COMPLETED",
        entity: "DonorProfile",
        entityId: booking.donorId,
        before: {
          lastDonationAt: booking.donor.lastDonationAt,
          donationCount: booking.donor.donationCount,
          nextEligibleAt: booking.donor.nextEligibleAt,
        },
        after: {
          lastDonationAt: updatedDonor.lastDonationAt,
          donationCount: updatedDonor.donationCount,
          nextEligibleAt: updatedDonor.nextEligibleAt,
        },
      },
    });

    await tx.eventLog.create({
      data: {
        name: "outcome_recorded",
        actorId: params.actorId,
        role: "COORDINATOR",
        entityId: booking.id,
        meta: {
          outcome: "COMPLETED",
          donorId: booking.donorId,
          nextEligibleAt: nextEligibleAt.toISOString(),
        },
      },
    });

    return tx.booking.findUniqueOrThrow({
      where: { id: b.id },
      include: {
        donor: true,
        slot: { include: { branch: true } },
      },
    });
  });

  return {
    booking: completed,
    alreadyRecorded: false,
  };
}

