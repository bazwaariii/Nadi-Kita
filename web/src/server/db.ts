import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_ELIGIBILITY_CONFIG,
  EligibilityConfig,
} from "@/server/rules/eligibility";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export function parseBranchRules(raw: unknown): EligibilityConfig {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_ELIGIBILITY_CONFIG;
  }
  const obj = raw as Partial<EligibilityConfig>;
  return {
    ...DEFAULT_ELIGIBILITY_CONFIG,
    ...obj,
    age: { ...DEFAULT_ELIGIBILITY_CONFIG.age, ...(obj.age || {}) },
    checkInWindowMin: {
      ...DEFAULT_ELIGIBILITY_CONFIG.checkInWindowMin,
      ...(obj.checkInWindowMin || {}),
    },
    invitation: {
      ...DEFAULT_ELIGIBILITY_CONFIG.invitation,
      ...(obj.invitation || {}),
    },
    slot: { ...DEFAULT_ELIGIBILITY_CONFIG.slot, ...(obj.slot || {}) },
  };
}

