"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { InvitationStatusChip } from "@/components/ui/StatusChip";

export interface InvitationRowView {
  id: string;
  rank: number;
  donorName: string;
  donorPhone: string;
  lastDonationText: string;
  scoreText: string;
  scorePct: number;
  reasonText: string;
  status: string;
  rawToken: string;
  invitationUrl: string;
  whatsappUrl: string;
}

export function CampaignInvitationsClient({
  campaignId,
  campaignStatus,
  invitations,
}: {
  campaignId: string;
  campaignStatus: string;
  invitations: InvitationRowView[];
}) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSendNow() {
    setSending(true);
    try {
      await fetch(`/api/campaigns/${campaignId}/send`, {
        method: "POST",
      });
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  function handleCopyLink(inv: InvitationRowView) {
    navigator.clipboard?.writeText(inv.invitationUrl).catch(() => {});
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  return (
    <section
      aria-labelledby="heading-invitations-table"
      className="rounded-panel border border-line bg-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2
            id="heading-invitations-table"
            className="text-[17px] font-bold text-ink"
          >
            Daftar undangan donor
          </h2>
          <p className="text-sm text-ink-muted">
            Tiga kanal pengiriman tersedia: email otomatis, salin tautan, atau
            kirim manual lewat WhatsApp.
          </p>
        </div>

        {campaignStatus === "DRAFT" && (
          <button
            type="button"
            disabled={sending}
            onClick={handleSendNow}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong disabled:opacity-60"
          >
            {sending ? "Mengirim..." : "Kirim undangan sekarang"}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line-strong bg-canvas text-left">
              <th className="h-10 px-3 text-right text-[13px] font-bold whitespace-nowrap text-ink-soft">
                #
              </th>
              <th className="h-10 px-3 text-[13px] font-bold whitespace-nowrap text-ink-soft">
                Nama donor
              </th>
              <th className="h-10 px-3 text-[13px] font-bold whitespace-nowrap text-ink-soft">
                Terakhir donor
              </th>
              <th className="h-10 px-3 text-right text-[13px] font-bold whitespace-nowrap text-ink-soft">
                Skor
              </th>
              <th className="h-10 px-3 text-[13px] font-bold whitespace-nowrap text-ink-soft">
                Alasan
              </th>
              <th className="h-10 px-3 text-[13px] font-bold whitespace-nowrap text-ink-soft">
                Status
              </th>
              <th className="h-10 px-3 text-[13px] font-bold whitespace-nowrap text-ink-soft">
                Kanal undangan
              </th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((inv) => (
              <tr
                key={inv.id}
                className="border-b border-line last:border-b-0 hover:bg-canvas/70"
              >
                <td className="px-3 py-2.5 text-right align-middle font-bold tabular-nums text-ink">
                  {inv.rank}
                </td>
                <td className="px-3 py-2.5 align-middle font-bold text-ink">
                  {inv.donorName}
                </td>
                <td className="px-3 py-2.5 align-middle tabular-nums text-ink-soft">
                  {inv.lastDonationText}
                </td>
                <td className="px-3 py-2.5 text-right align-middle tabular-nums">
                  <div className="inline-flex items-center justify-end gap-2">
                    <div
                      aria-hidden="true"
                      className="h-2 w-10 overflow-hidden rounded-pill bg-blush"
                    >
                      <div
                        className="h-full rounded-pill bg-brand"
                        style={{ width: `${inv.scorePct}%` }}
                      />
                    </div>
                    <span className="font-bold text-ink">{inv.scoreText}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 align-middle text-ink-soft">
                  {inv.reasonText}
                </td>
                <td className="px-3 py-2.5 align-middle">
                  <InvitationStatusChip status={inv.status} />
                </td>
                <td className="px-3 py-2.5 align-middle">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(inv)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-input border border-field bg-white px-2.5 text-xs font-bold text-ink transition-colors duration-150 hover:bg-canvas"
                    >
                      {copiedId === inv.id ? (
                        <>
                          <Check
                            size={13}
                            className="text-ok-ink"
                            aria-hidden="true"
                          />
                          <span>Disalin</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} aria-hidden="true" />
                          <span>Salin tautan</span>
                        </>
                      )}
                    </button>

                    <a
                      href={inv.whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center gap-1.5 rounded-input border border-field bg-white px-2.5 text-xs font-bold text-ink transition-colors duration-150 hover:bg-canvas"
                    >
                      <MessageCircle size={13} aria-hidden="true" />
                      <span>WhatsApp</span>
                    </a>

                    <Link
                      href={`/u/${inv.rawToken}`}
                      className="inline-flex h-9 items-center gap-1 rounded-input px-2.5 text-xs font-bold text-brand-strong hover:bg-canvas hover:underline"
                    >
                      <ExternalLink size={12} aria-hidden="true" />
                      <span>Buka tautan</span>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
