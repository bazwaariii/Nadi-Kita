import crypto from "crypto";

/**
 * Alfabet Crockford Base32 (tanpa I, L, O, U agar tidak membingungkan saat diketik manual)
 * sesuai planning.md Bagian 8.2 & 11.3
 */
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Membuat kode cadangan 8 karakter Crockford Base32 (contoh: "7H3K9Q2M").
 * Di UI ditampilkan sebagai "NK-7H3K9Q2M".
 */
export function generateBookingCode(seedInput?: string): string {
  const bytes = seedInput
    ? crypto.createHash("sha256").update(seedInput).digest()
    : crypto.randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += CROCKFORD_ALPHABET[bytes[i] % 32];
  }
  return out;
}

/**
 * Normalisasi kode tiket yang diketik petugas (menerima "NK-7H3K9Q2M" maupun "7H3K9Q2M")
 */
export function normalizeBookingCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/^NK-/, "").replace(/[\s-]/g, "");
  return cleaned;
}

export function formatDisplayBookingCode(code: string): string {
  const clean = normalizeBookingCode(code);
  return `NK-${clean}`;
}

/**
 * Format QR sesuai planning.md Bagian 11.3:
 * nk1.<bookingId>.<expUnix>.<HMAC-SHA256 base64url>
 */
export function signQrPayload(
  bookingId: string,
  expUnix: number,
  secret: string
): string {
  const data = `nk1.${bookingId}.${Math.floor(expUnix)}`;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

export type VerifiedQrResult =
  | { valid: true; bookingId: string; expUnix: number }
  | { valid: false; reason: "INVALID_FORMAT" | "INVALID_SIGNATURE" | "EXPIRED" };

export function verifyQrPayload(
  qrPayload: string,
  secret: string,
  nowUnix: number = Math.floor(Date.now() / 1000)
): VerifiedQrResult {
  const parts = qrPayload.trim().split(".");
  if (parts.length !== 4 || parts[0] !== "nk1") {
    return { valid: false, reason: "INVALID_FORMAT" };
  }
  const [, bookingId, expStr, providedSig] = parts;
  const expUnix = Number(expStr);
  if (!bookingId || !Number.isFinite(expUnix)) {
    return { valid: false, reason: "INVALID_FORMAT" };
  }

  const data = `nk1.${bookingId}.${Math.floor(expUnix)}`;
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, reason: "INVALID_SIGNATURE" };
  }

  if (nowUnix > expUnix) {
    return { valid: false, reason: "EXPIRED" };
  }

  return { valid: true, bookingId, expUnix };
}

