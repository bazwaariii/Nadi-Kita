import { PrismaClient } from "@prisma/client";
import { runSeed } from "./seed";

const prisma = new PrismaClient();

async function main() {
  console.log("[db:reset-demo] Mereset basis data ke skenario awal relatif terhadap hari ini...");
  await runSeed(new Date());
  console.log("[db:reset-demo] Skenario demo berhasil direset.");
}

main()
  .catch((err) => {
    console.error("[db:reset-demo] Gagal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

