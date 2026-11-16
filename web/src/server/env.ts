export const env = {
  DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
  AUTH_SECRET:
    process.env.AUTH_SECRET || "nadikita-stack2026-auth-secret-key-32bytes",
  APP_URL: process.env.APP_URL || "http://localhost:3000",
  QR_HMAC_SECRET:
    process.env.QR_HMAC_SECRET ||
    "nadikita-stack2026-qr-hmac-secret-key-32bytes",
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || "http://127.0.0.1:8000",
  ML_SERVICE_KEY: process.env.ML_SERVICE_KEY || "dev-ml-service-key-2026",
  EMAIL_FROM:
    process.env.EMAIL_FROM || "Nadi Kita UTD Simulasi <noreply@nadikita.test>",
  CRON_SECRET: process.env.CRON_SECRET || "nadikita-cron-secret-2026",
  DEFAULT_BRANCH_ID: process.env.DEFAULT_BRANCH_ID || "br_surabaya_simulasi",
};

