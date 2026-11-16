import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  QrCode,
  UserRound,
} from "lucide-react";
import {
  BLOOD_GROUP_META,
  BloodGroupCode,
  formatDateWIB,
  formatDayDateWIB,
  formatTimeWIB,
} from "@/lib/format-tanggal";
import { deriveInvitationToken } from "@/lib/tokens";
import { DonorNavigation } from "@/components/ui/Navigation";
import { BookingStatusChip, Chip } from "@/components/ui/StatusChip";
import { getSessionUser } from "@/server/auth";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { CancelBookingButton, DirectBookingClient } from "./DirectBookingClient";

export const dynamic = "force-dynamic";

export default async function DonorHomePage({
  searchParams,
}: {
  searchParams: Promise<{ viewDonor?: string; slotId?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSessionUser();

  if (!session && !sp.viewDonor) {
    const nextUrl = sp.slotId ? `/donor?slotId=${encodeURIComponent(sp.slotId)}` : "/donor";
    redirect(`/masuk?next=${encodeURIComponent(nextUrl)}`);
  }

  if (
    (session?.role === "ADMIN" || session?.role === "COORDINATOR") &&
    !sp.viewDonor
  ) {
    redirect("/koordinator");
  }

  let donor = null;
  if (sp.viewDonor) {
    donor = await db.donorProfile.findUnique({
      where: { id: sp.viewDonor },
    });
  }
  if (!donor && session?.donorId) {
    donor = await db.donorProfile.findUnique({
      where: { id: session.donorId },
    });
  }

  if (!donor) {
    return (
      <div className="min-h-screen bg-canvas pb-24 md:pb-10">
        <DonorNavigation />
        <main id="konten-utama" className="mx-auto max-w-[840px] px-4 py-8">
          <div className="rounded-panel border border-line bg-white p-6">
            <p className="text-base text-ink-soft">
              Profil pendonor belum tersedia. Silakan masuk atau daftar terlebih
              dahulu.
            </p>
            <div className="mt-4 flex gap-3">
              <Link
                href="/masuk"
                className="inline-flex h-11 items-center justify-center rounded-input bg-brand px-4 text-sm font-bold text-white hover:bg-brand-strong"
              >
                Masuk
              </Link>
              <Link
                href="/daftar"
                className="inline-flex h-11 items-center justify-center rounded-input border border-field bg-white px-4 text-sm font-bold text-ink hover:bg-canvas"
              >
                Daftar pendonor
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const invitations = await db.invitation.findMany({
    where: {
      donorId: donor.id,
      status: { in: ["SENT", "OPENED", "SCREENED_OK"] },
    },
    include: {
      campaign: { include: { branch: true } },
    },
    orderBy: { sentAt: "desc" },
  });

  const activeBooking = await db.booking.findFirst({
    where: {
      donorId: donor.id,
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
    },
    include: {
      slot: { include: { branch: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const activeTicketId = activeBooking?.id || "aktif";

  const now = new Date();
  const isCooldown =
    donor.nextEligibleAt && donor.nextEligibleAt.getTime() > now.getTime();
  const daysRemaining = isCooldown
    ? Math.max(
        1,
        Math.ceil(
          (donor.nextEligibleAt!.getTime() - now.getTime()) /
            (24 * 60 * 60 * 1000)
        )
      )
    : 0;
  const progressPct = isCooldown
    ? Math.min(100, Math.max(8, Math.round(((60 - daysRemaining) / 60) * 100)))
    : 100;

  const upcomingSlots = await db.slot.findMany({
    where: {
      startsAt: { gte: new Date(now.getTime() - 3600 * 1000) },
    },
    orderBy: { startsAt: "asc" },
    take: 36,
  });

  const availableDirectSlots = upcomingSlots
    .filter((s) => s.bookedCount < s.capacity)
    .map((s) => ({
      id: s.id,
      dayKey: formatDateWIB(s.startsAt),
      dayLabel: formatDayDateWIB(s.startsAt),
      timeLabel: formatTimeWIB(s.startsAt, true),
      remaining: Math.max(0, s.capacity - s.bookedCount),
      capacity: s.capacity,
    }));

  const groupDisplay =
    BLOOD_GROUP_META[donor.bloodGroup as BloodGroupCode]?.display ||
    donor.bloodGroup;

  return (
    <div className="min-h-screen bg-canvas pb-24 md:pb-10">
      <DonorNavigation activeTicketId={activeTicketId} />

      <main
        id="konten-utama"
        className="mx-auto max-w-[840px] space-y-6 px-4 py-6 sm:py-8"
      >
        {/* 1. Ringkasan identitas & status KTP */}
        <section
          aria-label="Identitas pendonor"
          className="rounded-panel border border-line bg-white p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                aria-label={`Golongan darah ${groupDisplay}`}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-panel bg-brand text-2xl font-bold text-white tabular-nums"
              >
                {groupDisplay}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {donor.ktpVerified ? (
                    <Chip tone="ok" Icon={CheckCircle2} size="sm">
                      KTP terverifikasi
                    </Chip>
                  ) : (
                    <Chip tone="warn" Icon={Clock} size="sm">
                      KTP menunggu verifikasi petugas
                    </Chip>
                  )}
                </div>

                <h1 className="mt-1.5 text-[24px] font-bold text-ink sm:text-[26px]">
                  {donor.fullName}
                </h1>

                <dl className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-soft">
                  <div>
                    <dt className="sr-only">Domisili</dt>
                    <dd>Domisili {donor.cohort || "Kota Surabaya"}</dd>
                  </div>
                  <div className="tabular-nums">
                    <dt className="sr-only">Riwayat donor</dt>
                    <dd>
                      Riwayat donor:{" "}
                      <strong className="font-bold text-ink">
                        {donor.donationCount} kali
                      </strong>
                    </dd>
                  </div>
                </dl>

                {donor.ktpFileData && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <a
                      href={`/api/admin/donors/${donor.id}/ktp`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center gap-1.5 rounded-input border border-line bg-canvas px-3 text-xs font-bold text-ink hover:bg-blush"
                    >
                      <FileText
                        size={14}
                        className="text-brand-strong"
                        aria-hidden="true"
                      />
                      <span>{donor.ktpFileName || "KTP_Pendonor.pdf"}</span>
                      <ExternalLink size={12} aria-hidden="true" />
                    </a>
                    <Link
                      href="/donor/profil"
                      className="inline-flex h-10 items-center gap-1.5 rounded-input px-3 text-xs font-bold text-brand-strong hover:bg-canvas"
                    >
                      <UserRound size={14} aria-hidden="true" />
                      <span>Ubah profil & KTP</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 2. Status masa jeda 60 hari */}
        {!isCooldown ? (
          <section
            aria-label="Status kelayakan donor"
            className="rounded-panel border border-ok-ink/25 bg-ok-fill p-5"
          >
            <div className="flex items-start gap-3.5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-input bg-white text-ok-ink">
                <Check size={20} strokeWidth={2} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-ink">
                  Anda sudah memenuhi masa jeda 60 hari
                </h2>
                <p className="mt-0.5 text-sm text-ink-soft tabular-nums">
                  {donor.lastDonationAt
                    ? `Donor terakhir ${formatDateWIB(donor.lastDonationAt)} (${donor.donationCount} kali tercatat).`
                    : "Belum ada catatan donor sebelumnya. Anda dapat memilih jadwal kedatangan di bawah."}
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section
            aria-label="Hitung mundur masa jeda donor"
            className="rounded-panel border border-line bg-white p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div
                role="img"
                aria-label={`Masa jeda sudah berjalan ${progressPct} persen, tersisa ${daysRemaining} hari`}
                className="relative flex h-16 w-16 shrink-0 items-center justify-center"
              >
                <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="#E7E5E4"
                    strokeWidth="3.5"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="#C8102E"
                    strokeWidth="3.5"
                    strokeDasharray={`${progressPct} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-xs font-bold text-ink tabular-nums">
                  {daysRemaining} hr
                </span>
              </div>

              <div>
                <h2 className="text-lg font-bold text-ink tabular-nums">
                  Anda bisa donor lagi dalam {daysRemaining} hari, mulai{" "}
                  {formatDateWIB(donor.nextEligibleAt!)}
                </h2>
                <p className="mt-0.5 text-sm text-ink-soft tabular-nums">
                  Donor terakhir Anda pada{" "}
                  {donor.lastDonationAt
                    ? formatDateWIB(donor.lastDonationAt)
                    : "belum tercatat"}
                  . Pemesanan dikunci selama masa pemulihan 60 hari demi
                  kesehatan Anda.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* 3. Jadwal aktif bila ada */}
        {activeBooking && (
          <section
            aria-labelledby="heading-active-booking"
            className="rounded-panel border border-brand/40 bg-blush/40 p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2
                  id="heading-active-booking"
                  className="text-xl font-bold text-ink"
                >
                  Jadwal donor aktif Anda
                </h2>
                <p className="mt-1 text-base font-bold text-ink tabular-nums">
                  {formatDayDateWIB(activeBooking.slot.startsAt)},{" "}
                  {formatTimeWIB(activeBooking.slot.startsAt, true)}
                </p>
                <p className="mt-0.5 text-sm text-ink-soft tabular-nums">
                  {activeBooking.slot.branch.name}, kode tiket{" "}
                  <strong className="font-bold text-brand-strong">
                    NK-{activeBooking.code}
                  </strong>
                </p>
              </div>
              <BookingStatusChip status={activeBooking.status} />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/donor/tiket/${activeBooking.id}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong"
              >
                <QrCode size={17} aria-hidden="true" />
                <span>Buka tiket QR</span>
              </Link>
              <CancelBookingButton bookingId={activeBooking.id} />
            </div>
          </section>
        )}

        {/* 4. Pemesanan jadwal mandiri */}
        {!isCooldown && !activeBooking && (
          <DirectBookingClient
            donorId={donor.id}
            slots={availableDirectSlots}
            initialSlotId={sp.slotId}
          />
        )}

        {/* 5. Undangan aktif */}
        <section aria-labelledby="heading-invitations" className="space-y-3">
          <h2 id="heading-invitations" className="text-xl font-bold text-ink">
            Undangan dari UTD
          </h2>

          {invitations.length === 0 ? (
            <div className="rounded-panel border border-line bg-white p-5">
              <p className="text-sm text-ink-soft">
                Belum ada undangan kebutuhan darurat untuk golongan darah Anda
                saat ini. Anda tetap dapat memesan jadwal rutin di atas.
              </p>
            </div>
          ) : (
            invitations.map((inv) => {
              const { rawToken } = deriveInvitationToken(
                inv.id,
                env.AUTH_SECRET
              );
              const gDisplay =
                BLOOD_GROUP_META[inv.campaign.group as BloodGroupCode]
                  ?.display || inv.campaign.group;

              return (
                <div
                  key={inv.id}
                  className="rounded-panel border border-line bg-white p-5"
                >
                  <p className="text-sm text-ink-muted">
                    {inv.campaign.branch.name}
                  </p>
                  <h3 className="mt-0.5 text-lg font-bold text-ink tabular-nums">
                    Permintaan golongan {gDisplay} hingga{" "}
                    {formatDateWIB(inv.campaign.deadlineAt)}
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft tabular-nums">
                    Target {inv.campaign.targetUnits} kantong. Anda diundang
                    karena sudah melewati masa jeda 60 hari.
                  </p>

                  <div className="mt-4">
                    <Link
                      href={`/u/${rawToken}`}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong"
                    >
                      <CalendarClock size={17} aria-hidden="true" />
                      <span>Isi pemeriksaan awal & pilih jam</span>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
