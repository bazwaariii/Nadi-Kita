import Link from "next/link";
import {
  BLOOD_GROUP_META,
  BloodGroupCode,
  formatDateWIB,
  formatDecimalID,
} from "@/lib/format-tanggal";
import { deriveInvitationToken } from "@/lib/tokens";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { buildInvitationLinks } from "@/server/services/email";
import { Chip } from "@/components/ui/StatusChip";
import { CampaignInvitationsClient } from "./CampaignInvitationsClient";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const campaign = await db.campaign.findUnique({
    where: { id },
    include: {
      branch: true,
      invitations: {
        include: {
          donor: true,
          booking: {
            include: { slot: true },
          },
        },
        orderBy: { rank: "asc" },
      },
    },
  });

  if (!campaign) {
    return (
      <div className="space-y-4">
        <h1 className="text-[26px] leading-tight font-bold text-ink">
          Permintaan donor tidak ditemukan
        </h1>
        <Link
          href="/koordinator"
          className="inline-flex h-10 items-center justify-center rounded-input border border-field bg-white px-4 text-sm font-bold text-ink transition-colors duration-150 hover:bg-canvas"
        >
          Kembali ke ruang kendali
        </Link>
      </div>
    );
  }

  const gDisplay =
    BLOOD_GROUP_META[campaign.group as BloodGroupCode]?.display ||
    campaign.group;

  const invitationsWithLinks = campaign.invitations.map((inv) => {
    const { rawToken } = deriveInvitationToken(inv.id, env.AUTH_SECRET);
    const links = buildInvitationLinks({
      rawToken,
      donorName: inv.donor.fullName,
      donorPhone: inv.donor.phone,
      bloodGroup: campaign.group as BloodGroupCode,
      branchName: campaign.branch.name,
      deadlineAt: campaign.deadlineAt,
    });
    const reasonsArr = Array.isArray(inv.reasons)
      ? (inv.reasons as { text?: string }[])
      : [];
    return {
      id: inv.id,
      rank: inv.rank,
      donorName: inv.donor.fullName,
      donorPhone: inv.donor.phone || "-",
      lastDonationText: inv.donor.lastDonationAt
        ? formatDateWIB(inv.donor.lastDonationAt)
        : "Donor baru",
      scoreText: formatDecimalID(inv.score, 2),
      scorePct: Math.min(100, Math.round(inv.score * 140)),
      reasonText: reasonsArr[0]?.text || "Memenuhi syarat masa jeda",
      status: inv.status,
      rawToken,
      invitationUrl: links.invitationUrl,
      whatsappUrl: links.whatsappUrl,
    };
  });

  const bookedCount = invitationsWithLinks.filter(
    (i) => i.status === "BOOKED"
  ).length;
  const openedCount = invitationsWithLinks.filter(
    (i) => i.status !== "SENT" && i.status !== "QUEUED"
  ).length;
  const bookedPct =
    campaign.targetUnits > 0
      ? Math.min(100, Math.round((bookedCount / campaign.targetUnits) * 100))
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[26px] leading-tight font-bold text-ink">
              Permintaan golongan {gDisplay} ({campaign.targetUnits} kantong)
            </h1>
            <Chip
              tone={campaign.status === "ACTIVE" ? "ok" : "warn"}
              size="sm"
            >
              {campaign.status === "ACTIVE" ? "Aktif" : "Draf"}
            </Chip>
          </div>
          <p className="mt-1 max-w-[70ch] text-[15px] text-ink-soft">
            {campaign.branch.name}, batas waktu{" "}
            {formatDateWIB(campaign.deadlineAt)}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/koordinator/permintaan/baru"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-input border border-field bg-white px-4 text-sm font-bold text-ink transition-colors duration-150 hover:bg-canvas"
          >
            Buat permintaan lain
          </Link>
        </div>
      </div>

      {/* Ringkasan konversi undangan */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-panel border border-line bg-white p-4">
          <p className="text-sm text-ink-muted">Undangan terkirim</p>
          <p className="mt-1 text-[26px] leading-none font-bold tabular-nums text-ink">
            {invitationsWithLinks.length}{" "}
            <span className="text-sm font-medium text-ink-muted">orang</span>
          </p>
        </div>
        <div className="rounded-panel border border-line bg-white p-4">
          <p className="text-sm text-ink-muted">Tautan dibuka</p>
          <p className="mt-1 text-[26px] leading-none font-bold tabular-nums text-ink">
            {openedCount}{" "}
            <span className="text-sm font-medium text-ink-muted">undangan</span>
          </p>
        </div>
        <div className="rounded-panel border border-line bg-white p-4">
          <p className="text-sm text-ink-muted">Jadwal dipesan</p>
          <p className="mt-1 text-[26px] leading-none font-bold tabular-nums text-ink">
            {bookedCount}{" "}
            <span className="text-sm font-medium text-ink-muted">
              dari {campaign.targetUnits} kantong
            </span>
          </p>
          <div
            aria-hidden="true"
            className="mt-2.5 h-2 w-full overflow-hidden rounded-pill bg-canvas"
          >
            <div
              className="h-full rounded-pill bg-brand transition-all"
              style={{ width: `${bookedPct}%` }}
            />
          </div>
        </div>
      </div>

      <CampaignInvitationsClient
        campaignId={campaign.id}
        campaignStatus={campaign.status}
        invitations={invitationsWithLinks}
      />
    </div>
  );
}
