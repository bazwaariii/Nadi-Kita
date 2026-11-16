import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Bagian 13 (Retensi): Menghapus akun dan data interaksi relawan uji coba setelah acara,
 * hanya menyisakan data sintetis dan hasil agregat.
 */
async function main() {
  const volunteers = await prisma.donorProfile.findMany({
    where: { cohort: "pilot-2026" },
    select: { id: true, userId: true },
  });

  const donorIds = volunteers.map((v) => v.id);
  const userIds = volunteers
    .map((v) => v.userId)
    .filter((id): id is string => Boolean(id));

  if (donorIds.length > 0) {
    const invitations = await prisma.invitation.findMany({
      where: { donorId: { in: donorIds } },
      select: { id: true },
    });
    const invIds = invitations.map((i) => i.id);

    await prisma.screening.deleteMany({
      where: { invitationId: { in: invIds } },
    });
    await prisma.donation.deleteMany({
      where: { donorId: { in: donorIds } },
    });
    await prisma.booking.deleteMany({
      where: { donorId: { in: donorIds } },
    });
    await prisma.invitation.deleteMany({
      where: { donorId: { in: donorIds } },
    });
    await prisma.donorProfile.deleteMany({
      where: { id: { in: donorIds } },
    });
  }

  if (userIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
  }

  await prisma.eventLog.updateMany({
    where: { role: "DONOR" },
    data: { actorId: null },
  });

  console.log(
    `[db:purge-volunteers] Berhasil menghapus ${donorIds.length} profil relawan dan menganonimkan log event.`
  );
}

main()
  .catch((err) => {
    console.error("[db:purge-volunteers] Gagal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

