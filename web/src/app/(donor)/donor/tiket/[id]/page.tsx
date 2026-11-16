import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BLOOD_GROUP_META,
  BloodGroupCode,
  formatDayDateWIB,
  formatTimeWIB,
} from "@/lib/format-tanggal";
import { signQrPayload } from "@/lib/qr";
import { QrTicketCard } from "@/components/tiket/QrTicketCard";
import { DonorNavigation } from "@/components/ui/Navigation";
import { getSessionUser } from "@/server/auth";
import { db } from "@/server/db";
import { env } from "@/server/env";

export const dynamic = "force-dynamic";

export default async function DonorTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionUser();

  if (!session) {
    redirect("/masuk");
  }

  const isStaff = session.role === "ADMIN" || session.role === "COORDINATOR";

  if (isStaff && id === "aktif") {
    redirect("/koordinator");
  }

  let booking = null;

  if (isStaff) {
    booking = await db.booking.findUnique({
      where: { id },
      include: {
        donor: true,
        slot: { include: { branch: true } },
      },
    });
  } else if (session.donorId) {
    if (id !== "aktif") {
      booking = await db.booking.findFirst({
        where: {
          id,
          donorId: session.donorId,
        },
        include: {
          donor: true,
          slot: { include: { branch: true } },
        },
      });
    }
    if (!booking) {
      booking = await db.booking.findFirst({
        where: {
          donorId: session.donorId,
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
        },
        include: {
          donor: true,
          slot: { include: { branch: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-canvas pb-24 md:pb-10">
        <DonorNavigation />
        <main
          id="konten-utama"
          className="mx-auto max-w-[540px] px-4 py-8"
        >
          <div className="rounded-panel border border-line bg-white p-6">
            <h1 className="text-xl font-bold text-ink">
              Belum ada tiket donor aktif
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              Pilih jam kedatangan di beranda pendonor untuk menerbitkan tiket
              QR Anda.
            </p>
            <div className="mt-5">
              <Link
                href="/donor"
                className="inline-flex h-11 items-center justify-center rounded-input bg-brand px-4 text-sm font-bold text-white hover:bg-brand-strong"
              >
                Kembali ke beranda donor
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const expUnix =
    Math.floor(booking.slot.endsAt.getTime() / 1000) + 6 * 3600;
  const qrPayload = signQrPayload(booking.id, expUnix, env.QR_HMAC_SECRET);
  const groupDisplay =
    BLOOD_GROUP_META[booking.donor.bloodGroup as BloodGroupCode]?.display ||
    booking.donor.bloodGroup;

  return (
    <div className="min-h-screen bg-canvas pb-24 md:pb-10">
      <DonorNavigation activeTicketId={booking.id} />

      <main
        id="konten-utama"
        className="mx-auto max-w-[540px] px-4 py-6 sm:py-8"
      >
        <QrTicketCard
          bookingId={booking.id}
          displayCode={`NK-${booking.code}`}
          qrPayload={qrPayload}
          dayDateLabel={formatDayDateWIB(booking.slot.startsAt)}
          timeLabel={formatTimeWIB(booking.slot.startsAt, true)}
          branchName={booking.slot.branch.name}
          donorName={booking.donor.fullName}
          bloodGroupDisplay={groupDisplay}
          status={booking.status}
        />
      </main>
    </div>
  );
}
