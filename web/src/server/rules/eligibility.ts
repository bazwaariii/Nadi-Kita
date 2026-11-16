import {
  formatDateWIB,
  formatDecimalID,
  formatShortDateWIB,
} from "@/lib/format-tanggal";

export interface EligibilityConfig {
  version: string;
  cooldownDays: number;
  age: { min: number; max: number };
  minWeightKg: number;
  minSleepHours: number;
  minHbGdl: number;
  maxDonationsPerRollingYear: number | null;
  bookBeforeMin: number;
  cancelBeforeMin: number;
  checkInWindowMin: { before: number; after: number };
  invitation: {
    expiresHours: number;
    maxPerDonor30d: number;
    overInviteFactor: number;
    maxInvitesPerCampaign: number;
  };
  firstTimerPrior: number;
  slot: { minutes: number; capacity: number };
}

export const DEFAULT_ELIGIBILITY_CONFIG: EligibilityConfig = {
  version: "2026-11-v1",
  cooldownDays: 60,
  age: { min: 17, max: 60 },
  minWeightKg: 45,
  minSleepHours: 4,
  minHbGdl: 12.5,
  maxDonationsPerRollingYear: null,
  bookBeforeMin: 60,
  cancelBeforeMin: 120,
  checkInWindowMin: { before: 30, after: 30 },
  invitation: {
    expiresHours: 48,
    maxPerDonor30d: 2,
    overInviteFactor: 1.5,
    maxInvitesPerCampaign: 80,
  },
  firstTimerPrior: 0.2,
  slot: { minutes: 30, capacity: 4 },
};

export interface DonorCandidateInput {
  id: string;
  fullName: string;
  bloodGroup: string;
  birthDate: Date;
  contactConsent: boolean;
  cohort: string | null;
  lastDonationAt: Date | null;
  firstDonationAt: Date | null;
  donationCount: number;
  hasActiveBooking: boolean;
  invitesLast30d: number;
}

export type FilterExclusionReason =
  | "BLOOD_GROUP"
  | "COHORT"
  | "NO_CONSENT"
  | "AGE"
  | "COOLDOWN"
  | "ACTIVE_BOOKING"
  | "FATIGUE_LIMIT";

export interface InvitationEligibilityResult {
  eligible: boolean;
  reason?: FilterExclusionReason;
  reasonText?: string;
  nextEligibleAt?: Date;
  daysRemainingInCooldown?: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function calculateAgeYears(birthDate: Date, now: Date): number {
  const diffDays = (now.getTime() - birthDate.getTime()) / MS_PER_DAY;
  return Math.floor(diffDays / 365.2425);
}

/**
 * BR-01: Menentukan apakah donor layak diundang dalam permintaan donor tertentu.
 * Fungsi murni (pure function), deterministik, tanpa pemanggilan ML.
 */
export function evaluateDonorInvitationEligibility(
  donor: DonorCandidateInput,
  params: {
    targetGroup: string;
    cohortFilter?: string | null;
  },
  config: EligibilityConfig = DEFAULT_ELIGIBILITY_CONFIG,
  now: Date = new Date()
): InvitationEligibilityResult {
  if (donor.bloodGroup !== params.targetGroup) {
    return {
      eligible: false,
      reason: "BLOOD_GROUP",
      reasonText: "Golongan darah berbeda",
    };
  }

  if (params.cohortFilter && donor.cohort !== params.cohortFilter) {
    return {
      eligible: false,
      reason: "COHORT",
      reasonText: "Di luar kelompok uji",
    };
  }

  if (!donor.contactConsent) {
    return {
      eligible: false,
      reason: "NO_CONSENT",
      reasonText: "Belum memberi izin dihubungi",
    };
  }

  const age = calculateAgeYears(donor.birthDate, now);
  if (age < config.age.min || age > config.age.max) {
    return {
      eligible: false,
      reason: "AGE",
      reasonText: `Usia di luar rentang ${config.age.min}–${config.age.max} tahun`,
    };
  }

  if (donor.lastDonationAt) {
    const nextEligibleAt = new Date(
      donor.lastDonationAt.getTime() + config.cooldownDays * MS_PER_DAY
    );
    if (now.getTime() < nextEligibleAt.getTime()) {
      const daysRemaining = Math.max(
        1,
        Math.ceil((nextEligibleAt.getTime() - now.getTime()) / MS_PER_DAY)
      );
      return {
        eligible: false,
        reason: "COOLDOWN",
        reasonText: `Masih masa jeda (${daysRemaining} hari lagi, boleh mulai ${formatDateWIB(nextEligibleAt)})`,
        nextEligibleAt,
        daysRemainingInCooldown: daysRemaining,
      };
    }
  }

  if (donor.hasActiveBooking) {
    return {
      eligible: false,
      reason: "ACTIVE_BOOKING",
      reasonText: "Sudah memiliki jadwal donor aktif",
    };
  }

  if (donor.invitesLast30d >= config.invitation.maxPerDonor30d) {
    return {
      eligible: false,
      reason: "FATIGUE_LIMIT",
      reasonText: `Melewati batas ${config.invitation.maxPerDonor30d} undangan per 30 hari`,
    };
  }

  return { eligible: true };
}

export interface ScreeningInput {
  weightKg: number;
  sleepHours: number;
  hbStatus: "OK" | "LOW" | "UNKNOWN";
  lastDonationConfirmedAt?: Date | string | null;
}

export interface ScreeningEvaluationResult {
  eligible: boolean;
  reasons: string[];
  nextEligibleDate: string | null;
  flags: string[];
  hbNote: string | null;
  disclaimer: string;
  rulesVersion: string;
}

/**
 * BR-08 & Lampiran B: Menilai 4 pertanyaan pemeriksaan awal secara deterministik.
 * Tidak memanggil ML.
 */
export function evaluateScreening(
  input: ScreeningInput,
  config: EligibilityConfig = DEFAULT_ELIGIBILITY_CONFIG,
  now: Date = new Date()
): ScreeningEvaluationResult {
  const reasons: string[] = [];
  const flags: string[] = [];
  let nextEligibleDate: Date | null = null;
  let hbNote: string | null = null;

  // 1. Berat badan
  if (input.weightKg < config.minWeightKg) {
    reasons.push(
      `Berat badan saat ini (${formatDecimalID(input.weightKg, 1)} kg) belum mencapai batas minimum ${config.minWeightKg} kg.`
    );
  }

  // 2. Jam tidur semalam
  if (input.sleepHours < config.minSleepHours) {
    reasons.push(
      `Waktu tidur semalam (${formatDecimalID(input.sleepHours, 1)} jam) kurang dari ${config.minSleepHours} jam. Kami sarankan memilih jadwal di hari lain setelah istirahat cukup.`
    );
    const tomorrow = new Date(now.getTime() + MS_PER_DAY);
    nextEligibleDate = tomorrow;
  }

  // 3. Hemoglobin terakhir
  if (input.hbStatus === "LOW") {
    reasons.push(
      `Hasil hemoglobin terakhir di bawah ${formatDecimalID(config.minHbGdl, 1)} g/dL. Demi keselamatan Anda, tunggu hingga kadar hemoglobin kembali normal.`
    );
  } else if (input.hbStatus === "UNKNOWN") {
    flags.push("HB_CHECK_ON_SITE");
    hbNote = "Tidak apa-apa. Petugas akan memeriksa hemoglobin Anda di lokasi.";
  }

  // 4. Tanggal donor terakhir
  if (input.lastDonationConfirmedAt) {
    const lastDate =
      typeof input.lastDonationConfirmedAt === "string"
        ? new Date(input.lastDonationConfirmedAt)
        : input.lastDonationConfirmedAt;

    if (!Number.isNaN(lastDate.getTime())) {
      const candidateNext = new Date(
        lastDate.getTime() + config.cooldownDays * MS_PER_DAY
      );
      if (now.getTime() < candidateNext.getTime()) {
        if (!nextEligibleDate || candidateNext > nextEligibleDate) {
          nextEligibleDate = candidateNext;
        }
        reasons.push(
          `Anda belum bisa donor hari ini. Donor terakhir Anda ${formatShortDateWIB(lastDate)}; Anda bisa donor lagi mulai ${formatShortDateWIB(candidateNext)}.`
        );
      }
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    nextEligibleDate: nextEligibleDate ? nextEligibleDate.toISOString() : null,
    flags,
    hbNote,
    disclaimer:
      "Ini pemeriksaan awal. Petugas UTD tetap memeriksa kesehatan Anda sebelum donor.",
    rulesVersion: config.version,
  };
}
