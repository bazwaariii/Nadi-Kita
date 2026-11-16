import { env } from "@/server/env";
import {
  DEFAULT_ELIGIBILITY_CONFIG,
  EligibilityConfig,
} from "@/server/rules/eligibility";
import {
  computeFallbackScore,
  DonorRawScore,
} from "@/server/rules/ranking";

export interface MlScoreDonorInput {
  id: string;
  lastDonationAt: Date | null;
  firstDonationAt: Date | null;
  donationCount: number;
}

export interface MlScoringResult {
  modelVersion: string;
  usedFallback: boolean;
  scoresById: Map<string, DonorRawScore>;
}

/**
 * Memanggil layanan FastAPI POST /v1/score dengan timeout 8 detik dan 1 kali percobaan ulang (planning.md 10.4).
 * Bila gagal atau layanan ML tidur, otomatis beralih ke fallback heuristik deterministik.
 */
export async function scoreDonorsWithMlOrFallback(
  donors: MlScoreDonorInput[],
  now: Date = new Date(),
  config: EligibilityConfig = DEFAULT_ELIGIBILITY_CONFIG,
  options?: { forceFallback?: boolean; serviceUrlOverride?: string }
): Promise<MlScoringResult> {
  const scoresById = new Map<string, DonorRawScore>();
  if (donors.length === 0) {
    return {
      modelVersion: "return-lr-v1",
      usedFallback: false,
      scoresById,
    };
  }

  if (!options?.forceFallback) {
    const baseUrl = options?.serviceUrlOverride || env.ML_SERVICE_URL;
    const payload = {
      asOf: now.toISOString().split("T")[0],
      donors: donors.slice(0, 500).map((d) => ({
        id: d.id,
        lastDonationAt: d.lastDonationAt
          ? d.lastDonationAt.toISOString().split("T")[0]
          : null,
        firstDonationAt: d.firstDonationAt
          ? d.firstDonationAt.toISOString().split("T")[0]
          : null,
        donationCount: d.donationCount,
      })),
    };

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`${baseUrl}/v1/score`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Service-Key": env.ML_SERVICE_KEY,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.ok) {
          const data = (await res.json()) as {
            modelVersion: string;
            scores: DonorRawScore[];
          };
          for (const item of data.scores) {
            scoresById.set(item.id, item);
          }
          return {
            modelVersion: data.modelVersion || "return-lr-v1",
            usedFallback: false,
            scoresById,
          };
        }
      } catch {
        // Lanjut ke percobaan berikutnya atau fallback
      }
    }
  }

  // Fallback heuristik sesuai planning.md Bagian 10.4
  for (const donor of donors) {
    scoresById.set(donor.id, computeFallbackScore(donor, now, config));
  }

  return {
    modelVersion: "heuristic-fallback-v1",
    usedFallback: true,
    scoresById,
  };
}

export async function warmUpMlService(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${env.ML_SERVICE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

