import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_booking_per_donor
    ON "Booking" ("donorId") WHERE status IN ('CONFIRMED', 'CHECKED_IN');
  `);
  console.log("[db:migrate] Indeks unik parsial one_active_booking_per_donor berhasil diterapkan.");
}

main()
  .catch((err) => {
    console.error("[db:migrate] Gagal menerapkan constraint:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

