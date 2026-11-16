import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { env } from "@/server/env";

const SESSION_COOKIE_NAME = "nadikita_session";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: "DONOR" | "COORDINATOR" | "ADMIN";
  donorId?: string | null;
  exp: number;
}

export function hashPassword(password: string): string {
  return crypto
    .createHmac("sha256", env.AUTH_SECRET)
    .update(`pwd:${password}`)
    .digest("hex");
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">): string {
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
  const full: SessionPayload = { ...payload, exp };
  const data = Buffer.from(JSON.stringify(full), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", env.AUTH_SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [data, sig] = parts;
    const expectedSig = crypto
      .createHmac("sha256", env.AUTH_SECRET)
      .update(data)
      .digest("base64url");
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    ) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!raw) return null;
    return verifySessionToken(raw);
  } catch {
    return null;
  }
}

export async function getDefaultDemoDonor() {
  const rizky = await db.donorProfile.findFirst({
    where: { email: "relawan01@contoh.test" },
  });
  if (rizky) return rizky;
  return db.donorProfile.findFirst({
    orderBy: { createdAt: "asc" },
  });
}

export { SESSION_COOKIE_NAME };

