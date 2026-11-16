import { formatDateWIB, formatTimeWIB } from "@/lib/format-tanggal";
import { db } from "@/server/db";
import { getInitialStockSnapshot } from "@/server/services/stock-view";
import { StockEditorClient } from "./StockEditorClient";

export const dynamic = "force-dynamic";

export default async function CoordinatorStockPage() {
  const initialStock = await getInitialStockSnapshot();
  const auditLogs = await db.auditLog.findMany({
    where: { entity: "StockLevel" },
    orderBy: { at: "desc" },
    take: 8,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] leading-tight font-bold text-ink">
            Perbarui stok darah
          </h1>
          <p className="mt-1 max-w-[70ch] text-[15px] text-ink-soft">
            Sesuaikan jumlah kantong dan ambang batas untuk setiap golongan
            darah di {initialStock.branch.name}. Semua perubahan dicatat pada
            log audit.
          </p>
        </div>
      </div>

      <StockEditorClient initialStock={initialStock.stock} />

      <section
        aria-labelledby="heading-audit-stock"
        className="rounded-panel border border-line bg-white"
      >
        <div className="border-b border-line px-4 py-3">
          <h2
            id="heading-audit-stock"
            className="text-[17px] font-bold text-ink"
          >
            Riwayat perubahan stok terbaru
          </h2>
        </div>

        {auditLogs.length === 0 ? (
          <p className="p-4 text-sm text-ink-soft">
            Belum ada perubahan stok manual yang tercatat hari ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line-strong bg-canvas">
                  <th className="h-10 px-3 text-[13px] font-bold text-ink-soft">
                    Waktu
                  </th>
                  <th className="h-10 px-3 text-[13px] font-bold text-ink-soft">
                    Golongan
                  </th>
                  <th className="h-10 px-3 text-right text-[13px] font-bold text-ink-soft">
                    Sebelum
                  </th>
                  <th className="h-10 px-3 text-right text-[13px] font-bold text-ink-soft">
                    Sesudah
                  </th>
                  <th className="h-10 px-3 text-[13px] font-bold text-ink-soft">
                    Alasan
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => {
                  const before = (log.before || {}) as {
                    group?: string;
                    units?: number;
                  };
                  const after = (log.after || {}) as {
                    group?: string;
                    units?: number;
                    reason?: string;
                  };
                  return (
                    <tr
                      key={log.id}
                      className="border-b border-line last:border-b-0 hover:bg-canvas/70"
                    >
                      <td className="px-3 py-2.5 text-ink-soft tabular-nums">
                        {formatDateWIB(log.at)}, {formatTimeWIB(log.at, true)}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-ink tabular-nums">
                        {after.group || before.group || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-ink-soft tabular-nums">
                        {before.units ?? 0} kantong
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-ink tabular-nums">
                        {after.units ?? 0} kantong
                      </td>
                      <td className="px-3 py-2.5 text-ink-soft">
                        {after.reason || "Pembaruan stok"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
