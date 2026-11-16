import {
  DEFAULT_ELIGIBILITY_CONFIG,
  EligibilityConfig,
} from "@/server/rules/eligibility";

export interface ScoreReasonItem {
  feature: string;
  text: string;
  impact: number;
}

export interface DonorRawScore {
  id: string;
  p: number;
  prior: boolean;
  reasons: ScoreReasonItem[];
}

export interface RankedDonorCandidate {
  id: string;
  fullName: string;
  bloodGroup: string;
  lastDonationAt: Date | null;
  firstDonationAt: Date | null;
  donationCount: number;
  invitesLast30d: number;
  p: number;
  priorityScore: number;
  prior: boolean;
  reasons: ScoreReasonItem[];
  summaryReason: string;
  rank: number;
  selected: boolean;
}

const MS_PER_MONTH = 30.4375 * 24 * 60 * 60 * 1000;

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * Fallback heuristik sesuai planning.md Bagian 10.4 bila layanan ML tidak merespons:
 * p = clamp(0,15 + 0,05 * min(F, 8) - 0,01 * max(R - 6, 0), 0,05, 0,6)
 * Untuk donor baru tanpa riwayat: memakai firstTimerPrior (default 0,20, BR-02).
 */
export function computeFallbackScore(
  donor: {
    id: string;
    lastDonationAt: Date | null;
    firstDonationAt: Date | null;
    donationCount: number;
  },
  now: Date = new Date(),
  config: EligibilityConfig = DEFAULT_ELIGIBILITY_CONFIG
): DonorRawScore {
  if (donor.donationCount <= 0 || !donor.lastDonationAt) {
    return {
      id: donor.id,
      p: config.firstTimerPrior,
      prior: true,
      reasons: [],
    };
  }

  const recencyMonths = Math.max(
    1,
    (now.getTime() - donor.lastDonationAt.getTime()) / MS_PER_MONTH
  );
  const f = donor.donationCount;
  const rawP =
    0.15 + 0.05 * Math.min(f, 8) - 0.01 * Math.max(recencyMonths - 6, 0);
  const p = Number(clamp(rawP, 0.05, 0.6).toFixed(4));

  const roundedR = Math.max(2, Math.round(recencyMonths));
  const reasons: ScoreReasonItem[] = [
    {
      feature: "frequency",
      text: f >= 3 ? `Donor rutin (${f} kali)` : `Pernah donor (${f} kali)`,
      impact: Number((0.05 * Math.min(f, 8)).toFixed(2)),
    },
    {
      feature: "recency",
      text: `Terakhir donor ${roundedR} bulan lalu`,
      impact: Number((-0.01 * Math.max(recencyMonths - 6, 0)).toFixed(2)),
    },
  ];

  return {
    id: donor.id,
    p,
    prior: false,
    reasons,
  };
}

/**
 * BR-03: Prioritas = p * (1 - 0,5 * kelelahan)
 * dengan kelelahan = undangan 30 hari terakhir / maksimum per 30 hari (rentang 0–1)
 */
export function computePriorityWithFatigue(
  p: number,
  invitesLast30d: number,
  maxPerDonor30d: number
): number {
  const maxAllowed = Math.max(1, maxPerDonor30d);
  const fatigue = clamp(invitesLast30d / maxAllowed, 0, 1);
  return Number((p * (1 - 0.5 * fatigue)).toFixed(4));
}

/**
 * BR-04: Jumlah undangan K dipilih sebagai bilangan terkecil sehingga jumlah p
 * dari K donor teratas >= target * overInviteFactor, dibatasi maxInvitesPerCampaign.
 */
export function selectInviteCountK(
  sortedScores: number[],
  targetUnits: number,
  config: EligibilityConfig = DEFAULT_ELIGIBILITY_CONFIG,
  customInviteCount?: number | null
): { selectedK: number; expectedUnits: number; requiredExpected: number } {
  const maxCap = Math.min(
    sortedScores.length,
    config.invitation.maxInvitesPerCampaign
  );
  const requiredExpected = targetUnits * config.invitation.overInviteFactor;

  if (customInviteCount && customInviteCount > 0) {
    const k = Math.min(customInviteCount, maxCap);
    const sumP = sortedScores.slice(0, k).reduce((acc, v) => acc + v, 0);
    return {
      selectedK: k,
      expectedUnits: Number(sumP.toFixed(1)),
      requiredExpected: Number(requiredExpected.toFixed(1)),
    };
  }

  let runningSum = 0;
  let k = 0;
  for (let i = 0; i < maxCap; i++) {
    runningSum += sortedScores[i];
    k = i + 1;
    if (runningSum >= requiredExpected) {
      break;
    }
  }

  return {
    selectedK: k,
    expectedUnits: Number(runningSum.toFixed(1)),
    requiredExpected: Number(requiredExpected.toFixed(1)),
  };
}

export function formatCandidateSummaryReason(
  prior: boolean,
  donationCount: number,
  reasons: ScoreReasonItem[]
): string {
  if (prior || donationCount === 0) {
    return "Donor baru (prior standar)";
  }
  if (reasons.length > 0) {
    return reasons[0].text;
  }
  return donationCount >= 3
    ? `Donor rutin (${donationCount} kali)`
    : `Pernah donor (${donationCount} kali)`;
}

export interface CampaignWarning {
  code: "LOW_CANDIDATES" | "LOW_SLOT_CAPACITY" | "ML_FALLBACK";
  message: string;
}

/**
 * BR-05, BR-06 & 10.4: Menyusun peringatan kapasitas, kandidat kurang, atau fallback ML
 */
export function buildCampaignWarnings(params: {
  eligibleCount: number;
  selectedK: number;
  expectedUnits: number;
  targetUnits: number;
  availableSlotCapacity: number;
  usedFallback: boolean;
}): CampaignWarning[] {
  const warnings: CampaignWarning[] = [];

  if (params.usedFallback) {
    warnings.push({
      code: "ML_FALLBACK",
      message:
        "Peringkat sementara. Layanan skor belum merespons, urutan memakai aturan sederhana.",
    });
  }

  if (
    params.eligibleCount === 0 ||
    params.expectedUnits < params.targetUnits
  ) {
    warnings.push({
      code: "LOW_CANDIDATES",
      message: `Kandidat layak hanya ${params.eligibleCount}, target ${params.targetUnits} kantong mungkin tidak tercapai. Sarankan memperpanjang batas waktu atau menghubungi UTD lain.`,
    });
  }

  if (params.availableSlotCapacity < params.selectedK && params.selectedK > 0) {
    warnings.push({
      code: "LOW_SLOT_CAPACITY",
      message: `Kapasitas slot sampai batas waktu (${params.availableSlotCapacity} kursi) lebih kecil dari jumlah undangan (${params.selectedK}). Buka slot tambahan agar donor mendapat jadwal.`,
    });
  }

  return warnings;
}

