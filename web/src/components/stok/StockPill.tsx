"use client";

import { useEffect, useState } from "react";
import { StockStatusChip, type StockStatusLevel } from "@/components/ui/StatusChip";

const FILL_CLASS: Record<StockStatusLevel, string> = {
  critical: "bg-brand",
  low: "bg-apricot",
  ok: "bg-ok-ink",
};

const LABEL_MAP: Record<StockStatusLevel, string> = {
  critical: "kritis",
  low: "menipis",
  ok: "aman",
};

export type StockPillProps = {
  group: string; // tampil: "O−" (U+2212)
  spoken: string; // dibaca: "O negatif"
  units: number;
  criticalAt: number;
  safeAt: number;
  index?: number;
};

/**
 * Indikator stok kantong darah Nadi Kita (MASTER.md bagian 6).
 * Menampilkan tabung takar kantong darah vertikal + mistar horizontal dengan
 * garis batas aman dan chip status (ikon + teks + warna).
 */
export function StockPill({
  group,
  spoken,
  units,
  criticalAt,
  safeAt,
  index = 0,
}: StockPillProps) {
  const level: StockStatusLevel =
    units <= criticalAt ? "critical" : units < safeAt ? "low" : "ok";
  const fill = FILL_CLASS[level];
  const statusWord = LABEL_MAP[level];
  const max = Math.max(safeAt * 1.5, units, 1);
  const pct = Math.min(100, Math.round((units / max) * 100));
  const safePct = Math.min(100, Math.round((safeAt / max) * 100));

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 20 + index * 40);
    return () => clearTimeout(timer);
  }, [index]);

  const displayedPct = mounted ? pct : 0;

  return (
    <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[4.5rem_1fr_5.75rem_auto] sm:items-center sm:gap-3">
      {/* Identitas golongan + tabung kantong darah mini */}
      <div className="flex items-center justify-between sm:contents">
        <div className="flex items-center gap-2.5">
          {/* Tabung kantong darah vertikal (elemen khas MASTER.md bagian 6) */}
          <div
            aria-hidden="true"
            className="relative flex h-9 w-6 shrink-0 flex-col justify-end overflow-hidden rounded-[5px] border border-line-strong bg-canvas"
          >
            {/* Leher kantong di bagian atas */}
            <span className="pointer-events-none absolute top-0 left-1/2 z-10 h-1 w-2.5 -translate-x-1/2 rounded-b-[2px] bg-line-strong" />
            {/* Garis batas aman */}
            <span
              className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-ink/55"
              style={{ bottom: `${safePct}%` }}
            />
            {/* Isi cairan darah */}
            <div
              className={`w-full transition-all duration-500 ease-out ${fill}`}
              style={{
                height: `${displayedPct}%`,
                minHeight: mounted && units > 0 ? "4px" : "0px",
              }}
            />
          </div>

          <span
            className="text-xl font-bold text-ink tabular-nums"
            aria-hidden="true"
          >
            {group}
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:contents">
          <span className="text-right tabular-nums sm:order-3">
            <span className="text-base font-bold text-ink">{units}</span>{" "}
            <span className="text-sm text-ink-muted">kantong</span>
          </span>

          <div className="sm:order-4">
            <StockStatusChip level={level} />
          </div>
        </div>
      </div>

      {/* Mistar horizontal dengan penanda batas aman */}
      <div
        role="meter"
        aria-label={`Golongan ${spoken}`}
        aria-valuemin={0}
        aria-valuemax={Math.round(max)}
        aria-valuenow={units}
        aria-valuetext={`${units} kantong, status ${statusWord}, batas aman ${safeAt} kantong`}
        className="relative h-6 w-full overflow-hidden rounded-input border border-line-strong bg-canvas sm:order-2"
      >
        <div
          className={`h-full rounded-[6px] ${fill}`}
          style={{
            width: `${displayedPct}%`,
            minWidth: mounted && units > 0 ? "0.75rem" : "0rem",
            transitionProperty: "width",
            transitionDuration: "500ms",
            transitionTimingFunction: "cubic-bezier(0.2, 0.7, 0.2, 1)",
          }}
        />
        <span
          aria-hidden="true"
          title={`Batas aman: ${safeAt} kantong`}
          className="absolute inset-y-0 w-[2px] bg-ink"
          style={{ left: `${safePct}%` }}
        />
      </div>
    </div>
  );
}
