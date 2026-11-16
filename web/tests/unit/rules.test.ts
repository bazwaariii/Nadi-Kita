import { describe, expect, it } from "vitest";
import {
  BLOOD_GROUP_META,
  BLOOD_GROUP_ORDER,
  formatDateWIB,
  formatDecimalID,
  formatNumberID,
  formatRelativeTimeID,
  formatTimeWIB,
} from "@/lib/format-tanggal";
import { generateTicketIcs } from "@/lib/ics";
import {
  generateBookingCode,
  normalizeBookingCode,
  signQrPayload,
  verifyQrPayload,
} from "@/lib/qr";
import { deriveInvitationToken, hashInvitationToken } from "@/lib/tokens";
import {
  DEFAULT_ELIGIBILITY_CONFIG,
  evaluateDonorInvitationEligibility,
  evaluateScreening,
} from "@/server/rules/eligibility";
import {
  buildCampaignWarnings,
  computeFallbackScore,
  computePriorityWithFatigue,
  selectInviteCountK,
} from "@/server/rules/ranking";
import {
  computeEffectiveBookingStatus,
  evaluateCancellationAllowed,
  evaluateCheckInWindow,
  evaluateSlotBookability,
} from "@/server/rules/slots";

describe("Format WIB, Golongan Darah & Utilitas Kriptografi", () => {
  it("memakai tanda minus sebenarnya U+2212 pada golongan Rhesus negatif (design.md 4.3)", () => {
    expect(BLOOD_GROUP_META.O_NEG.display).toBe("O\u2212");
    expect(BLOOD_GROUP_META.AB_NEG.display).toBe("AB\u2212");
    expect(BLOOD_GROUP_META.O_NEG.spoken).toBe("O negatif");
    expect(BLOOD_GROUP_ORDER).toEqual([
      "A_POS",
      "B_POS",
      "O_POS",
      "AB_POS",
      "A_NEG",
      "B_NEG",
      "O_NEG",
      "AB_NEG",
    ]);
  });

  it("memformat tanggal, jam WIB dengan titik, angka ribuan, dan desimal koma (design.md 9.4)", () => {
    // 2026-11-18T02:30:00Z == 09.30 WIB
    const dt = new Date("2026-11-18T02:30:00.000Z");
    expect(formatDateWIB(dt)).toBe("18 Nov 2026");
    expect(formatTimeWIB(dt, true)).toBe("09.30 WIB");
    expect(formatNumberID(1250)).toBe("1.250");
    expect(formatDecimalID(12.5, 1)).toBe("12,5");
  });

  it("AC-11: mendeteksi data stok lama bila diperbarui lebih dari 6 jam lalu", () => {
    const now = new Date("2026-11-18T12:00:00.000Z");
    const nineHoursAgo = new Date(now.getTime() - 9 * 3600 * 1000);
    const rel = formatRelativeTimeID(nineHoursAgo, now);
    expect(rel.isStale).toBe(true);
    expect(rel.hoursElapsed).toBe(9);
    expect(rel.text).toBe("Diperbarui 9 jam lalu");
  });

  it("menandatangani dan memverifikasi payload QR nk1.<bookingId>.<expUnix>.<sig> (11.3)", () => {
    const secret = "test-qr-secret-2026";
    const payload = signQrPayload("bkg_123", 2000000000, secret);
    expect(payload.startsWith("nk1.bkg_123.2000000000.")).toBe(true);

    const ok = verifyQrPayload(payload, secret, 1900000000);
    expect(ok).toEqual({
      valid: true,
      bookingId: "bkg_123",
      expUnix: 2000000000,
    });

    const expired = verifyQrPayload(payload, secret, 2000000005);
    expect(expired).toEqual({ valid: false, reason: "EXPIRED" });

    const tampered = verifyQrPayload(`${payload}x`, secret, 1900000000);
    expect(tampered).toEqual({ valid: false, reason: "INVALID_SIGNATURE" });
  });

  it("membuat kode cadangan 8 karakter Crockford base32 tanpa karakter ambigu I, L, O, U", () => {
    const code = generateBookingCode("seed-test");
    expect(code).toHaveLength(8);
    expect(/[ILOU]/.test(code)).toBe(false);
    expect(normalizeBookingCode(`nk-${code.toLowerCase()}`)).toBe(code);
  });

  it("BR-07: menghasilkan token undangan 32 byte dan menyimpan hanya hash SHA-256", () => {
    const { rawToken, tokenHash } = deriveInvitationToken(
      "inv_001",
      "secret-key"
    );
    expect(rawToken).toHaveLength(64);
    expect(tokenHash).toBe(hashInvitationToken(rawToken));
    expect(tokenHash).not.toBe(rawToken);
  });

  it("menghasilkan file kalender .ics yang valid untuk tiket donor", () => {
    const ics = generateTicketIcs({
      bookingCode: "7H3K9Q2M",
      donorName: "Rizky Pratama",
      branchName: "UTD Simulasi Surabaya",
      startsAt: new Date("2026-11-18T02:30:00Z"),
      endsAt: new Date("2026-11-18T03:00:00Z"),
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("NK-7H3K9Q2M");
    expect(ics).toContain("UTD Simulasi Surabaya");
  });
});

describe("Mesin Aturan Kelayakan & Pemeriksaan Awal (BR-01, BR-08, AC-02, AC-05)", () => {
  const now = new Date("2026-11-18T02:00:00.000Z");

  it("AC-02: menolak donor B+ yang donor terakhirnya 30 hari lalu karena masih masa jeda 60 hari", () => {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const res = evaluateDonorInvitationEligibility(
      {
        id: "dnr_cooldown",
        fullName: "Budi Santoso",
        bloodGroup: "B_POS",
        birthDate: new Date("2000-01-10"),
        contactConsent: true,
        cohort: null,
        lastDonationAt: thirtyDaysAgo,
        firstDonationAt: thirtyDaysAgo,
        donationCount: 1,
        hasActiveBooking: false,
        invitesLast30d: 0,
      },
      { targetGroup: "B_POS" },
      DEFAULT_ELIGIBILITY_CONFIG,
      now
    );

    expect(res.eligible).toBe(false);
    expect(res.reason).toBe("COOLDOWN");
    expect(res.daysRemainingInCooldown).toBe(30);
  });

  it("menerima donor B+ yang sudah melewati masa jeda 60 hari dan memberi izin dihubungi", () => {
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
    const res = evaluateDonorInvitationEligibility(
      {
        id: "dnr_ok",
        fullName: "Rizky Pratama",
        bloodGroup: "B_POS",
        birthDate: new Date("2001-04-12"),
        contactConsent: true,
        cohort: "pilot-2026",
        lastDonationAt: ninetyDaysAgo,
        firstDonationAt: ninetyDaysAgo,
        donationCount: 3,
        hasActiveBooking: false,
        invitesLast30d: 1,
      },
      { targetGroup: "B_POS" },
      DEFAULT_ELIGIBILITY_CONFIG,
      now
    );

    expect(res.eligible).toBe(true);
  });

  it("AC-05: pemeriksaan awal dengan berat badan di bawah 45 kg atau masa jeda belum 60 hari mengembalikan eligible=false beserta alasan dan tanggal boleh coba lagi", () => {
    const twentyFiveDaysAgo = new Date("2026-10-23T02:00:00.000Z");
    const evalLowWeightAndCooldown = evaluateScreening(
      {
        weightKg: 42,
        sleepHours: 6,
        hbStatus: "OK",
        lastDonationConfirmedAt: twentyFiveDaysAgo,
      },
      DEFAULT_ELIGIBILITY_CONFIG,
      now
    );

    expect(evalLowWeightAndCooldown.eligible).toBe(false);
    expect(evalLowWeightAndCooldown.reasons.length).toBeGreaterThanOrEqual(2);
    expect(evalLowWeightAndCooldown.reasons[0]).toContain("45 kg");
    expect(evalLowWeightAndCooldown.reasons[1]).toContain(
      "Anda belum bisa donor hari ini. Donor terakhir Anda 23 Okt; Anda bisa donor lagi mulai 22 Des."
    );
    expect(evalLowWeightAndCooldown.nextEligibleDate).not.toBeNull();
  });

  it("T4: jawaban hemoglobin UNKNOWN tidak memblokir kelayakan, melainkan memberi catatan pemeriksaan di lokasi", () => {
    const res = evaluateScreening(
      {
        weightKg: 60,
        sleepHours: 7,
        hbStatus: "UNKNOWN",
        lastDonationConfirmedAt: null,
      },
      DEFAULT_ELIGIBILITY_CONFIG,
      now
    );

    expect(res.eligible).toBe(true);
    expect(res.flags).toContain("HB_CHECK_ON_SITE");
    expect(res.hbNote).toBe(
      "Tidak apa-apa. Petugas akan memeriksa hemoglobin Anda di lokasi."
    );
  });
});

describe("Aturan Ranking, Kelelahan Undangan & Fallback ML (BR-02, BR-03, BR-04, BR-05, BR-06)", () => {
  it("BR-02 & 10.4: memberikan prior 0,20 untuk donor baru dan skor heuristik terbatas [0,05, 0,60] untuk donor berulang", () => {
    const now = new Date("2026-11-18T00:00:00Z");
    const firstTimer = computeFallbackScore(
      {
        id: "d1",
        lastDonationAt: null,
        firstDonationAt: null,
        donationCount: 0,
      },
      now
    );
    expect(firstTimer.prior).toBe(true);
    expect(firstTimer.p).toBe(0.2);

    const repeatDonor = computeFallbackScore(
      {
        id: "d2",
        lastDonationAt: new Date("2026-07-18T00:00:00Z"),
        firstDonationAt: new Date("2024-07-18T00:00:00Z"),
        donationCount: 6,
      },
      now
    );
    expect(repeatDonor.prior).toBe(false);
    expect(repeatDonor.p).toBeGreaterThan(0.35);
    expect(repeatDonor.p).toBeLessThanOrEqual(0.6);
  });

  it("BR-03: menghitung penalti kelelahan undangan p * (1 - 0,5 * kelelahan)", () => {
    expect(computePriorityWithFatigue(0.5, 0, 2)).toBe(0.5);
    expect(computePriorityWithFatigue(0.5, 1, 2)).toBe(0.375);
    expect(computePriorityWithFatigue(0.5, 2, 2)).toBe(0.25);
  });

  it("BR-04: memilih jumlah undangan K terkecil sehingga jumlah p >= target * 1,5", () => {
    const scores = Array.from({ length: 30 }, () => 0.5);
    // Target 4 kantong * 1.5 = 6.0 -> butuh 12 donor dengan skor 0.5
    const res = selectInviteCountK(scores, 4, DEFAULT_ELIGIBILITY_CONFIG);
    expect(res.selectedK).toBe(12);
    expect(res.expectedUnits).toBe(6);
  });

  it("BR-05 & BR-06: menghasilkan peringatan saat kandidat kurang atau kapasitas slot tidak mencukupi", () => {
    const warnings = buildCampaignWarnings({
      eligibleCount: 4,
      selectedK: 4,
      expectedUnits: 1.8,
      targetUnits: 6,
      availableSlotCapacity: 2,
      usedFallback: true,
    });
    const codes = warnings.map((w) => w.code);
    expect(codes).toContain("ML_FALLBACK");
    expect(codes).toContain("LOW_CANDIDATES");
    expect(codes).toContain("LOW_SLOT_CAPACITY");
  });
});

describe("Aturan Slot, Pembatalan & Jendela Check-in (BR-09, BR-10, BR-11, AC-07)", () => {
  // Slot jam 09.30 WIB (02:30 UTC)
  const slotStartsAt = new Date("2026-11-18T02:30:00.000Z");

  it("AC-07: menolak check-in di luar jendela 30 menit dan menampilkan jam buka check-in yang benar", () => {
    // Datang jam 08.15 WIB (01:15 UTC), sebelum jendela buka 09.00 WIB
    const earlyNow = new Date("2026-11-18T01:15:00.000Z");
    const earlyRes = evaluateCheckInWindow(
      slotStartsAt,
      earlyNow,
      DEFAULT_ELIGIBILITY_CONFIG
    );
    expect(earlyRes.valid).toBe(false);
    expect(earlyRes.message).toBe(
      "Tiket ini untuk 09.30. Check-in dibuka mulai 09.00."
    );

    // Datang jam 09.20 WIB (02:20 UTC), di dalam jendela [09.00, 10.00]
    const validNow = new Date("2026-11-18T02:20:00.000Z");
    const validRes = evaluateCheckInWindow(
      slotStartsAt,
      validNow,
      DEFAULT_ELIGIBILITY_CONFIG
    );
    expect(validRes.valid).toBe(true);
  });

  it("BR-09 & BR-10: memeriksa kapasitas slot, batas waktu pesan, batas batal, dan lazy NO_SHOW", () => {
    const fullSlot = evaluateSlotBookability(
      { startsAt: slotStartsAt, capacity: 4, bookedCount: 4 },
      new Date("2026-11-17T00:00:00Z")
    );
    expect(fullSlot.bookable).toBe(false);
    expect(fullSlot.message).toBe(
      "Jam 09.30 baru saja penuh. Pilih jam lain di bawah."
    );

    const lateCancel = evaluateCancellationAllowed(
      slotStartsAt,
      new Date("2026-11-18T01:30:00.000Z") // 60 menit sebelum slot (< 120 menit)
    );
    expect(lateCancel.allowed).toBe(false);

    const lazyNoShow = computeEffectiveBookingStatus(
      "CONFIRMED",
      slotStartsAt,
      new Date("2026-11-18T04:00:00.000Z")
    );
    expect(lazyNoShow).toBe("NO_SHOW");
  });
});

