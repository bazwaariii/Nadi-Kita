import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_ELIGIBILITY_CONFIG,
  EligibilityConfig,
} from "@/server/rules/eligibility";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function cleanDbUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  let cleaned = raw.trim();
  // Strip accidental surrounding quotes or `psql '...'` prefix if user pasted from Neon UI
  if (cleaned.startsWith("psql ")) {
    cleaned = cleaned.slice(5).trim();
  }
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned || undefined;
}

const rawEnvUrl = cleanDbUrl(process.env.DATABASE_URL);
export const resolvedDbUrl =
  rawEnvUrl && rawEnvUrl !== "file:./dev.db"
    ? rawEnvUrl
    : cleanDbUrl(process.env.NETLIFY_DB_URL) ||
      cleanDbUrl(process.env.NETLIFY_DATABASE_URL) ||
      cleanDbUrl(process.env.POSTGRES_URL) ||
      rawEnvUrl;

export function getDbType(): "postgres" | "sqlite" | "none" {
  if (!resolvedDbUrl) return "none";
  if (
    resolvedDbUrl.startsWith("postgres://") ||
    resolvedDbUrl.startsWith("postgresql://")
  ) {
    return "postgres";
  }
  if (resolvedDbUrl.startsWith("file:")) return "sqlite";
  return "none";
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(resolvedDbUrl ? { datasources: { db: { url: resolvedDbUrl } } } : {}),
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

