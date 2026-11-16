"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import {
  BLOOD_GROUP_META,
  BLOOD_GROUP_ORDER,
  BloodGroupCode,
  formatDateWIB,
  formatDecimalID,
} from "@/lib/format-tanggal";
import { CampaignPreviewResult } from "@/server/services/campaigns";

export default function NewCampaignPage() {
  return (
    <Suspense
      fallback={
        <div className="h-64 rounded-panel border border-line bg-white p-4" />
      }
    >
      <NewCampaignContent />
    </Suspense>
  );
}

function NewCampaignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGroupParam = (searchParams.get("group") ||
    "B_POS") as BloodGroupCode;
  const validInitialGroup = BLOOD_GROUP_ORDER.includes(initialGroupParam)
    ? initialGroupParam
    : "B_POS";

  const defaultDeadline = new Date(Date.now() + 5 * 24 * 3600 * 1000)
    .toISOString()
    .split("T")[0];

  const [group, setGroup] = useState<BloodGroupCode>(validInitialGroup);
  const [targetUnits, setTargetUnits] = useState<number>(8);
  const [deadlineAt, setDeadlineAt] = useState<string>(defaultDeadline);
  const [cohortMode, setCohortMode] = useState<"ALL" | "PILOT">("ALL");
  const [manualKEnabled, setManualKEnabled] = useState(false);
  const [manualK, setManualK] = useState<number>(18);

  const [preview, setPreview] = useState<CampaignPreviewResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [showCooldownList, setShowCooldownList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Catat pembukaan halaman pembuatan permintaan untuk metrik T1 & kirim ping pemanasan ML
  useEffect(() => {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "campaign_create_opened" }),
    }).catch(() => {});
  }, []);

  // Debounce 400 ms saat formulir berubah
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoadingPreview(true);
      try {
        const res = await fetch("/api/campaigns/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            group,
            targetUnits: Math.max(1, targetUnits || 1),
            deadlineAt,
            cohortFilter: cohortMode === "PILOT" ? "pilot-2026" : null,
            customInviteCount: manualKEnabled ? manualK : null,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setPreview(data);
          if (!manualKEnabled) {
            setManualK(data.selectedK);
          }
        }
      } catch {
        // Pertahankan pratinjau sebelumnya bila jaringan terputus sementara
      } finally {
        setLoadingPreview(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [group, targetUnits, deadlineAt, cohortMode, manualKEnabled, manualK]);

  async function handleAction(sendImmediately: boolean) {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group,
          targetUnits,
          deadlineAt,
          cohortFilter: cohortMode === "PILOT" ? "pilot-2026" : null,
          customInviteCount: manualKEnabled ? manualK : null,
          sendImmediately,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(
          data?.error?.message || "Gagal menyimpan permintaan donor."
        );
        setSubmitting(false);
        return;
      }
      router.push(`/koordinator/permintaan/${data.campaign.id}`);
      router.refresh();
    } catch {
      setErrorMsg("Koneksi terputus. Perubahan belum tersimpan. Coba lagi.");
      setSubmitting(false);
    }
  }

  const selectedCount = preview?.selectedK ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] leading-tight font-bold text-ink">
            Buat permintaan donor
          </h1>
          <p className="mt-1 max-w-[70ch] text-[15px] text-ink-soft">
            Pilih golongan darah dan target kantong. Sistem otomatis menyaring
            donor yang masih dalam masa jeda 60 hari dan mengurutkan kandidat
            yang paling siap.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-input border border-brand/30 bg-blush px-4 py-3 text-sm text-ink"
        >
          <TriangleAlert
            size={18}
            strokeWidth={1.75}
            className="mt-0.5 shrink-0 text-brand-strong"
            aria-hidden="true"
          />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Kolom kiri: Formulir permintaan */}
        <section
          aria-label="Formulir permintaan donor"
          className="rounded-panel border border-line bg-white lg:col-span-5"
        >
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-[17px] font-bold text-ink">
              Parameter permintaan
            </h2>
            <p className="text-sm text-ink-muted">
              Tentukan kebutuhan kantong dan batas waktu pengumpulan.
            </p>
          </div>

          <div className="space-y-4 p-4">
            <div>
              <label
                htmlFor="cmp-group"
                className="block text-sm font-bold text-ink"
              >
                Golongan darah
              </label>
              <select
                id="cmp-group"
                value={group}
                onChange={(e) => {
                  setGroup(e.target.value as BloodGroupCode);
                  setManualKEnabled(false);
                }}
                className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base font-bold text-ink transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
              >
                {BLOOD_GROUP_ORDER.map((code) => (
                  <option key={code} value={code}>
                    {BLOOD_GROUP_META[code].display} (
                    {BLOOD_GROUP_META[code].spoken})
                  </option>
                ))}
              </select>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGroup("B_POS");
                    setTargetUnits(8);
                    setManualKEnabled(false);
                  }}
                  className="h-8 rounded-input border border-line bg-canvas px-2.5 text-xs font-medium text-ink-soft transition-colors hover:bg-blush/50 hover:text-ink"
                >
                  Skenario B+ (8 kantong)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGroup("O_NEG");
                    setTargetUnits(6);
                    setManualKEnabled(false);
                  }}
                  className="h-8 rounded-input border border-line bg-canvas px-2.5 text-xs font-medium text-ink-soft transition-colors hover:bg-blush/50 hover:text-ink"
                >
                  Skenario langka O− (BR-05)
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="cmp-target"
                className="block text-sm font-bold text-ink"
              >
                Target kantong
              </label>
              <div className="relative mt-1.5 max-w-[200px]">
                <input
                  id="cmp-target"
                  type="number"
                  min={1}
                  max={100}
                  value={targetUnits}
                  onChange={(e) => {
                    setTargetUnits(parseInt(e.target.value || "1", 10));
                    setManualKEnabled(false);
                  }}
                  className="h-11 w-full rounded-input border border-field bg-white pr-20 pl-3 text-base font-bold tabular-nums text-ink transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-muted">
                  kantong
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="cmp-deadline"
                className="block text-sm font-bold text-ink"
              >
                Batas waktu
              </label>
              <input
                id="cmp-deadline"
                type="date"
                value={deadlineAt}
                onChange={(e) => setDeadlineAt(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base text-ink transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
              />
            </div>

            <fieldset>
              <legend className="block text-sm font-bold text-ink">
                Kelompok sasaran
              </legend>
              <div className="mt-1.5 grid grid-cols-2 gap-2.5">
                {[
                  { val: "ALL", label: "Semua donor" },
                  { val: "PILOT", label: "Uji coba (pilot)" },
                ].map((opt) => (
                  <label
                    key={opt.val}
                    className={`flex h-11 cursor-pointer items-center gap-2 rounded-input border px-3 text-sm transition-colors ${
                      cohortMode === opt.val
                        ? "border-brand-strong bg-blush/50 font-bold text-ink"
                        : "border-field bg-white font-medium text-ink hover:bg-canvas"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cohortMode"
                      value={opt.val}
                      checked={cohortMode === opt.val}
                      onChange={() => {
                        setCohortMode(opt.val as "ALL" | "PILOT");
                        setManualKEnabled(false);
                      }}
                      className="h-4 w-4 accent-[#C8102E]"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="cmp-k"
                  className="block text-sm font-bold text-ink"
                >
                  Jumlah undangan (K)
                </label>
                <button
                  type="button"
                  onClick={() => setManualKEnabled((v) => !v)}
                  className="text-xs font-bold text-brand-strong hover:underline"
                >
                  {manualKEnabled ? "Hitung otomatis" : "Atur manual"}
                </button>
              </div>
              <input
                id="cmp-k"
                type="number"
                min={1}
                max={80}
                disabled={!manualKEnabled}
                value={manualKEnabled ? manualK : selectedCount}
                onChange={(e) =>
                  setManualK(Math.max(1, parseInt(e.target.value || "1", 10)))
                }
                className="mt-1.5 h-11 w-32 rounded-input border border-field bg-white px-3 text-base font-bold tabular-nums text-ink transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none disabled:bg-canvas disabled:text-ink-soft"
              />
              <p className="mt-1 text-sm text-ink-muted">
                Dihitung agar jumlah skor kecenderungan kembali mencapai 1,5
                kali target kantong.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <button
                type="button"
                disabled={submitting || selectedCount === 0}
                onClick={() => handleAction(false)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-input border border-field bg-white px-4 text-sm font-bold text-ink transition-colors duration-150 hover:bg-canvas disabled:opacity-60"
              >
                Simpan draf
              </button>

              <button
                type="button"
                disabled={submitting || selectedCount === 0}
                onClick={() => handleAction(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong disabled:opacity-60"
              >
                {submitting
                  ? "Mengirim..."
                  : `Kirim ${selectedCount} undangan`}
              </button>
            </div>
          </div>
        </section>

        {/* Kolom kanan: Pratinjau peringkat donor */}
        <section
          aria-label="Pratinjau peringkat donor"
          className="rounded-panel border border-line bg-white lg:col-span-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 className="text-[17px] font-bold text-ink">
                Pratinjau peringkat donor
              </h2>
              {preview && (
                <p className="text-sm tabular-nums text-ink-muted">
                  <strong className="text-ink">{preview.eligibleCount}</strong>{" "}
                  donor memenuhi syarat, terpilih{" "}
                  <strong className="text-ink">{preview.selectedK}</strong>{" "}
                  (perkiraan{" "}
                  <strong className="text-ink">
                    {formatDecimalID(preview.expectedUnits, 1)}
                  </strong>{" "}
                  kantong)
                </p>
              )}
            </div>
            {loadingPreview && (
              <span className="text-xs font-medium text-ink-muted">
                Memperbarui pratinjau...
              </span>
            )}
          </div>

          <div className="space-y-4 p-4">
            {/* Peringatan BR-05, BR-06, atau fallback ML */}
            {preview &&
              preview.warnings.map((w) => (
                <div
                  key={w.code}
                  role="alert"
                  className="flex items-start gap-3 rounded-input border border-warn-ink/25 bg-warn-fill px-4 py-3 text-sm text-ink"
                >
                  <TriangleAlert
                    size={18}
                    strokeWidth={1.75}
                    className="mt-0.5 shrink-0 text-warn-ink"
                    aria-hidden="true"
                  />
                  <span>{w.message}</span>
                </div>
              ))}

            {/* Tabel ranking donor */}
            {preview && preview.candidates.length > 0 ? (
              <div className="overflow-x-auto rounded-panel border border-line bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line-strong bg-canvas text-left">
                      <th className="h-10 px-3 text-right text-[13px] font-bold whitespace-nowrap text-ink-soft">
                        #
                      </th>
                      <th className="h-10 px-3 text-[13px] font-bold whitespace-nowrap text-ink-soft">
                        Nama
                      </th>
                      <th className="h-10 px-3 text-[13px] font-bold whitespace-nowrap text-ink-soft">
                        Golongan
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
                    </tr>
                  </thead>
                  <tbody>
                    {preview.candidates.slice(0, 24).map((cand) => {
                      const barPct = Math.min(
                        100,
                        Math.round(cand.priorityScore * 140)
                      );
                      return (
                        <tr
                          key={cand.id}
                          className={`border-b border-line last:border-b-0 ${
                            cand.selected
                              ? "bg-blush/35 hover:bg-blush/55"
                              : "bg-white hover:bg-canvas/70"
                          }`}
                        >
                          <td className="px-3 py-2.5 text-right align-middle font-bold tabular-nums text-ink">
                            {cand.rank}
                          </td>
                          <td className="px-3 py-2.5 align-middle font-bold text-ink">
                            {cand.fullName}
                          </td>
                          <td className="px-3 py-2.5 align-middle">
                            <span className="inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-input border border-brand/25 bg-blush px-2 text-xs font-bold tabular-nums text-brand-strong">
                              {
                                BLOOD_GROUP_META[
                                  cand.bloodGroup as BloodGroupCode
                                ].display
                              }
                            </span>
                          </td>
                          <td className="px-3 py-2.5 align-middle tabular-nums text-ink-soft">
                            {cand.lastDonationAt
                              ? formatDateWIB(cand.lastDonationAt)
                              : "Belum pernah"}
                          </td>
                          <td className="px-3 py-2.5 text-right align-middle tabular-nums">
                            <div className="inline-flex items-center justify-end gap-2">
                              <div
                                aria-hidden="true"
                                className="h-2 w-12 overflow-hidden rounded-pill bg-blush"
                              >
                                <div
                                  className="h-full rounded-pill bg-brand"
                                  style={{ width: `${barPct}%` }}
                                />
                              </div>
                              <span className="font-bold text-ink">
                                {formatDecimalID(cand.priorityScore, 2)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 align-middle text-ink-soft">
                            {cand.summaryReason}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              !loadingPreview && (
                <p className="py-4 text-sm text-ink-soft">
                  Tidak ada kandidat yang memenuhi syarat untuk saringan ini.
                </p>
              )
            )}

            {/* Informasi donor yang tersaring karena masih dalam masa jeda 60 hari */}
            {preview && (
              <div className="rounded-input border border-line bg-canvas p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-ink">
                    <strong className="tabular-nums">
                      {preview.cooldownExcludedCount}
                    </strong>{" "}
                    donor lain bergolongan{" "}
                    <strong className="tabular-nums">
                      {
                        BLOOD_GROUP_META[preview.group as BloodGroupCode]
                          .display
                      }
                    </strong>{" "}
                    masih dalam masa jeda 60 hari (tidak diundang).
                  </p>
                  {preview.cooldownExcludedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowCooldownList((v) => !v)}
                      className="text-xs font-bold text-brand-strong hover:underline"
                    >
                      {showCooldownList
                        ? "Sembunyikan daftar masa jeda"
                        : "Lihat donor dalam masa jeda"}
                    </button>
                  )}
                </div>

                {showCooldownList &&
                  preview.cooldownExcludedDonors.length > 0 && (
                    <div className="mt-3 max-h-52 overflow-y-auto border-t border-line pt-3">
                      <ul className="space-y-1.5 text-xs text-ink-soft">
                        {preview.cooldownExcludedDonors.map((ex) => (
                          <li
                            key={ex.id}
                            className="flex flex-wrap items-center justify-between gap-2"
                          >
                            <span className="font-bold text-ink">
                              {ex.fullName}
                            </span>
                            <span className="tabular-nums">
                              {ex.reasonText}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
