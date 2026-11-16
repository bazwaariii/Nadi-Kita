import crypto from "crypto";

/**
 * Membuat token acak 32 byte (64 karakter hex) sesuai BR-07
 */
export function generateRandomToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashInvitationToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Menghasilkan token deterministik 32 byte berbasis HMAC-SHA256 dari invitationId + secret
 * sehingga hanya tokenHash yang disimpan di basis data (BR-07), namun koordinator tetap
 * dapat menyalin tautan atau mengirim lewat WhatsApp (K6).
 */
export function deriveInvitationToken(
  invitationId: string,
  secret: string
): { rawToken: string; tokenHash: string } {
  const rawToken = crypto
    .createHmac("sha256", secret)
    .update(`nadikita-inv-v1:${invitationId}`)
    .digest("hex");
  const tokenHash = hashInvitationToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Menghitung SHA-256 hash dari token undangan
 */
export function hashInvitationToken(rawToken: string): string {
  return crypto
    .createHash("sha256")
    .update(rawToken.trim())
    .digest("hex");
}

