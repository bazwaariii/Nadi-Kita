import { formatDecimalID } from "@/lib/format-tanggal";
import { getPilotMetricsSummary } from "@/server/services/metrics";

export const dynamic = "force-dynamic";

export default async function CoordinatorMetricsPage() {
  const summary = await getPilotMetricsSummary();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] leading-tight font-bold text-ink">
            Metrik uji coba relawan
          </h1>
          <p className="mt-1 max-w-[70ch] text-[15px] text-ink-soft">
            Hasil pengukuran langsung dari catatan aktivitas untuk memantau
            target waktu pengiriman permintaan donor (di bawah 120 detik) dan
            pemesanan jadwal oleh donor (di bawah 180 detik).
          </p>
        </div>
      </div>

      {/* Tiga angka utama */}
      <section
        aria-label="Ringkasan tiga metrik utama"
        className="grid gap-4 sm:grid-cols-3"
      >
        <div className="rounded-panel border border-line bg-white p-4">
          <p className="text-sm text-ink-muted">Median waktu undang (T1)</p>
          <p className="mt-1 text-[26px] leading-none font-bold tabular-nums text-ink">
            {summary.medianInviteSeconds}{" "}
            <span className="text-sm font-medium text-ink-muted">detik</span>
          </p>
          <p className="mt-1.5 text-xs text-ink-soft">
            Target penelitian: di bawah 120 detik
          </p>
        </div>

        <div className="rounded-panel border border-line bg-white p-4">
          <p className="text-sm text-ink-muted">Median waktu pilih jam (T2)</p>
          <p className="mt-1 text-[26px] leading-none font-bold tabular-nums text-ink">
            {summary.medianBookingSeconds}{" "}
            <span className="text-sm font-medium text-ink-muted">detik</span>
          </p>
          <p className="mt-1.5 text-xs text-ink-soft">
            Target penelitian: di bawah 180 detik
          </p>
        </div>

        <div className="rounded-panel border border-line bg-white p-4">
          <p className="text-sm text-ink-muted">Skor SUS median</p>
          <p className="mt-1 text-[26px] leading-none font-bold tabular-nums text-ink">
            {formatDecimalID(summary.susScoreMedian, 1)}{" "}
            <span className="text-sm font-medium text-ink-muted">/ 100</span>
          </p>
          <p className="mt-1.5 text-xs text-ink-soft">
            Dari {summary.susRespondents} responden relawan (pilot-2026)
          </p>
        </div>
      </section>

      {/* Tabel rincian per tugas (n, median, kuartil, tingkat selesai) */}
      <section
        aria-labelledby="heading-task-breakdown"
        className="rounded-panel border border-line bg-white"
      >
        <div className="border-b border-line px-4 py-3">
          <h2
            id="heading-task-breakdown"
            className="text-[17px] font-bold text-ink"
          >
            Rincian waktu penyelesaian per tugas
          </h2>
          <p className="text-sm text-ink-muted">
            Dilaporkan dalam median dan rentang kuartil (Q1 sampai Q3) sesuai
            protokol evaluasi.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-strong bg-canvas text-left">
                <th className="h-10 px-3 text-[13px] font-bold whitespace-nowrap text-ink-soft">
                  Kode
                </th>
                <th className="h-10 px-3 text-[13px] font-bold whitespace-nowrap text-ink-soft">
                  Tugas
                </th>
                <th className="h-10 px-3 text-[13px] font-bold whitespace-nowrap text-ink-soft">
                  Peran
                </th>
                <th className="h-10 px-3 text-right text-[13px] font-bold whitespace-nowrap text-ink-soft">
                  Peserta (n)
                </th>
                <th className="h-10 px-3 text-right text-[13px] font-bold whitespace-nowrap text-ink-soft">
                  Median (dtk)
                </th>
                <th className="h-10 px-3 text-right text-[13px] font-bold whitespace-nowrap text-ink-soft">
                  Kuartil Q1 sampai Q3
                </th>
                <th className="h-10 px-3 text-right text-[13px] font-bold whitespace-nowrap text-ink-soft">
                  Tingkat selesai
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.tasks.map((t) => (
                <tr
                  key={t.taskCode}
                  className="border-b border-line last:border-b-0 hover:bg-canvas/70"
                >
                  <td className="px-3 py-2.5 align-middle font-bold tabular-nums text-ink">
                    {t.taskCode}
                  </td>
                  <td className="px-3 py-2.5 align-middle font-bold text-ink">
                    {t.taskLabel}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-ink-soft">
                    {t.roleLabel}
                  </td>
                  <td className="px-3 py-2.5 text-right align-middle tabular-nums text-ink">
                    {t.n}
                  </td>
                  <td className="px-3 py-2.5 text-right align-middle font-bold tabular-nums text-ink">
                    {t.medianSeconds} dtk
                  </td>
                  <td className="px-3 py-2.5 text-right align-middle tabular-nums text-ink-soft">
                    {t.q1Seconds} sampai {t.q3Seconds} dtk
                  </td>
                  <td className="px-3 py-2.5 text-right align-middle font-bold tabular-nums text-ink">
                    {t.completionRatePct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Grafik batang horizontal sebaran waktu */}
      <section
        aria-labelledby="heading-time-distribution"
        className="rounded-panel border border-line bg-white"
      >
        <div className="border-b border-line px-4 py-3">
          <h2
            id="heading-time-distribution"
            className="text-[17px] font-bold text-ink"
          >
            Sebaran waktu pemesanan jadwal oleh donor (T2)
          </h2>
          <p className="text-sm text-ink-muted">
            Distribusi durasi dari saat tautan undangan dibuka hingga tiket QR
            terbit.
          </p>
        </div>

        <div className="space-y-3 p-4">
          {summary.bookingTimeDistribution.map((row) => (
            <div
              key={row.bucket}
              className="grid grid-cols-[9.5rem_1fr_5.5rem] items-center gap-3 text-sm"
            >
              <span className="font-medium text-ink">{row.bucket}</span>
              <div className="h-6 w-full overflow-hidden rounded-input border border-line bg-canvas">
                <div
                  className="h-full bg-brand"
                  style={{
                    width: `${Math.max(row.pct, row.count > 0 ? 8 : 0)}%`,
                  }}
                />
              </div>
              <span className="text-right font-bold tabular-nums text-ink">
                {row.count} orang
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
