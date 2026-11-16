"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Minus, Plus, TriangleAlert } from "lucide-react";
import { StockApiItem } from "@/components/stok/LiveStockBoard";
import { StockStatusChip } from "@/components/ui/StatusChip";

export function StockEditorClient({
  initialStock,
}: {
  initialStock: StockApiItem[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialStock);
  const [reason, setReason] = useState("Pembaruan stok harian oleh koordinator");
  const [savingGroup, setSavingGroup] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function updateLocalRow(
    group: string,
    field: "units" | "criticalAt" | "safeAt",
    val: number
  ) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.group !== group) return r;
        const nextVal = Math.max(0, val);
        const nextUnits = field === "units" ? nextVal : r.units;
        const nextCrit = field === "criticalAt" ? nextVal : r.criticalAt;
        const nextSafe = field === "safeAt" ? nextVal : r.safeAt;
        const level: "critical" | "low" | "ok" =
          nextUnits <= nextCrit
            ? "critical"
            : nextUnits < nextSafe
              ? "low"
              : "ok";
        return {
          ...r,
          units: nextUnits,
          criticalAt: nextCrit,
          safeAt: nextSafe,
          level,
        };
      })
    );
  }

  async function handleSaveGroup(row: StockApiItem) {
    setSavingGroup(row.group);
    setToastMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/stock/${row.group}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          units: row.units,
          criticalAt: row.criticalAt,
          safeAt: row.safeAt,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error?.message || "Gagal memperbarui stok.");
        setSavingGroup(null);
        return;
      }
      setToastMsg(`Stok ${row.display} disimpan (${row.units} kantong)`);
      router.refresh();
    } catch {
      setErrorMsg("Koneksi terputus. Perubahan belum tersimpan. Coba lagi.");
    } finally {
      setSavingGroup(null);
    }
  }

  return (
    <div className="space-y-4">
      {toastMsg && (
        <div
          role="status"
          className="fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-input border border-line bg-white px-4 py-3 text-sm font-bold text-ink shadow-[var(--shadow-float)]"
        >
          <CheckCircle2
            size={18}
            className="shrink-0 text-ok-ink"
            aria-hidden="true"
          />
          <span>{toastMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-input border border-brand/30 bg-blush p-3.5 text-sm text-ink"
        >
          <TriangleAlert
            size={18}
            className="mt-0.5 shrink-0 text-brand-strong"
            aria-hidden="true"
          />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="rounded-panel border border-line bg-white p-4">
        <label
          htmlFor="stock-reason"
          className="block text-sm font-bold text-ink"
        >
          Alasan perubahan stok
        </label>
        <input
          id="stock-reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1.5 h-10 w-full max-w-[480px] rounded-input border border-field bg-white px-3 text-sm text-ink focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
        />
        <p className="mt-1 text-xs text-ink-muted">
          Catatan ini disimpan ke log audit setiap kali Anda menyimpan baris
          stok.
        </p>
      </div>

      <div className="overflow-x-auto rounded-panel border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line-strong bg-canvas">
              <th className="h-10 px-3 text-[13px] font-bold text-ink-soft">
                Golongan
              </th>
              <th className="h-10 px-3 text-[13px] font-bold text-ink-soft">
                Status
              </th>
              <th className="h-10 px-3 text-[13px] font-bold text-ink-soft">
                Jumlah kantong
              </th>
              <th className="h-10 px-3 text-right text-[13px] font-bold text-ink-soft">
                Ambang kritis
              </th>
              <th className="h-10 px-3 text-right text-[13px] font-bold text-ink-soft">
                Batas aman
              </th>
              <th className="h-10 px-3 text-right text-[13px] font-bold text-ink-soft">
                Tindakan
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.group}
                className="border-b border-line last:border-b-0 hover:bg-canvas/70"
              >
                <td className="px-3 py-2.5 text-lg font-bold text-ink tabular-nums">
                  {row.display}
                </td>
                <td className="px-3 py-2.5">
                  <StockStatusChip level={row.level} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={`Kurangi 1 kantong ${row.spoken}`}
                      onClick={() =>
                        updateLocalRow(row.group, "units", row.units - 1)
                      }
                      className="inline-flex h-10 w-10 items-center justify-center rounded-input border border-field bg-white text-ink hover:bg-canvas"
                    >
                      <Minus size={15} aria-hidden="true" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      aria-label={`Jumlah kantong ${row.spoken}`}
                      value={row.units}
                      onChange={(e) =>
                        updateLocalRow(
                          row.group,
                          "units",
                          parseInt(e.target.value || "0", 10)
                        )
                      }
                      className="h-10 w-20 rounded-input border border-field bg-white px-2.5 text-center text-base font-bold text-ink tabular-nums focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      aria-label={`Tambah 1 kantong ${row.spoken}`}
                      onClick={() =>
                        updateLocalRow(row.group, "units", row.units + 1)
                      }
                      className="inline-flex h-10 w-10 items-center justify-center rounded-input border border-field bg-white text-ink hover:bg-canvas"
                    >
                      <Plus size={15} aria-hidden="true" />
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <input
                    type="number"
                    min={0}
                    aria-label={`Ambang kritis ${row.spoken}`}
                    value={row.criticalAt}
                    onChange={(e) =>
                      updateLocalRow(
                        row.group,
                        "criticalAt",
                        parseInt(e.target.value || "0", 10)
                      )
                    }
                    className="h-10 w-20 rounded-input border border-field bg-white px-2.5 text-right text-sm font-medium text-ink tabular-nums focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <input
                    type="number"
                    min={1}
                    aria-label={`Batas aman ${row.spoken}`}
                    value={row.safeAt}
                    onChange={(e) =>
                      updateLocalRow(
                        row.group,
                        "safeAt",
                        parseInt(e.target.value || "1", 10)
                      )
                    }
                    className="h-10 w-20 rounded-input border border-field bg-white px-2.5 text-right text-sm font-medium text-ink tabular-nums focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    type="button"
                    disabled={savingGroup === row.group}
                    onClick={() => handleSaveGroup(row)}
                    className="inline-flex h-10 items-center justify-center rounded-input bg-brand px-3.5 text-xs font-bold text-white transition-colors duration-150 hover:bg-brand-strong disabled:opacity-60"
                  >
                    {savingGroup === row.group
                      ? "Menyimpan..."
                      : "Simpan"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
