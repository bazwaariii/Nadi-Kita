"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { CalendarClock, Droplet, TriangleAlert } from "lucide-react";
import { StockPill } from "@/components/stok/StockPill";
import { Chip } from "@/components/ui/StatusChip";

export interface StockApiItem {
  id: string;
  group: string;
  display: string;
  spoken: string;
  units: number;
  criticalAt: number;
  safeAt: number;
  level: "critical" | "low" | "ok";
  updatedAt: string;
}

export interface StockApiResponse {
  branch: {
    id: string;
    name: string;
    city: string;
    isSimulated: boolean;
  };
  updatedAt: string;
  relativeUpdatedText: string;
  isStale: boolean;
  hoursElapsed: number;
  stock: StockApiItem[];
}

const COMPATIBILITY_MAP: Record<
  string,
  { donateTo: string[]; receiveFrom: string[]; note: string }
> = {
  O_NEG: {
    donateTo: ["O−", "O+", "A−", "A+", "B−", "B+", "AB−", "AB+"],
    receiveFrom: ["O−"],
    note: "Pendonor universal sel darah merah, sangat dibutuhkan pada penanganan gawat darurat.",
  },
  O_POS: {
    donateTo: ["O+", "A+", "B+", "AB+"],
    receiveFrom: ["O+", "O−"],
    note: "Golongan darah dengan populasi terbanyak, pemakaian harian di rumah sakit sangat tinggi.",
  },
  A_NEG: {
    donateTo: ["A−", "A+", "AB−", "AB+"],
    receiveFrom: ["A−", "O−"],
    note: "Golongan Rhesus negatif langka, cadangan wajib dijaga di atas batas kritis.",
  },
  A_POS: {
    donateTo: ["A+", "AB+"],
    receiveFrom: ["A+", "A−", "O+", "O−"],
    note: "Permintaan tinggi untuk tindakan bedah terjadwal dan perawatan talasemia.",
  },
  B_NEG: {
    donateTo: ["B−", "B+", "AB−", "AB+"],
    receiveFrom: ["B−", "O−"],
    note: "Populasi Rhesus negatif di Indonesia kurang dari 1%, setiap kantong sangat berharga.",
  },
  B_POS: {
    donateTo: ["B+", "AB+"],
    receiveFrom: ["B+", "B−", "O+", "O−"],
    note: "Salah satu golongan paling sering dibutuhkan di UTD wilayah Jawa Timur.",
  },
  AB_NEG: {
    donateTo: ["AB−", "AB+"],
    receiveFrom: ["AB−", "A−", "B−", "O−"],
    note: "Pendonor universal plasma segar beku dan golongan Rhesus negatif paling langka.",
  },
  AB_POS: {
    donateTo: ["AB+"],
    receiveFrom: ["O−", "O+", "A−", "A+", "B−", "B+", "AB−", "AB+"],
    note: "Resipien universal sel darah merah dan pendonor plasma utama.",
  },
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function LiveStockBoard({
  initialData,
  columns = 2,
  mode = "public",
}: {
  initialData?: StockApiResponse;
  columns?: 1 | 2;
  mode?: "public" | "coordinator";
}) {
  const { data } = useSWR<StockApiResponse>("/api/stock", fetcher, {
    fallbackData: initialData,
    refreshInterval: 12000,
  });

  const [selectedGroupCode, setSelectedGroupCode] = useState<string | null>(
    "O_NEG"
  );

  if (!data || !data.stock) {
    return (
      <div className="rounded-panel border border-line bg-white p-5">
        <div className="mb-4 h-5 w-48 rounded-input bg-canvas" />
        <div
          className={`grid gap-3 ${columns === 2 ? "lg:grid-cols-2 lg:gap-x-6" : "grid-cols-1"}`}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-11 rounded-input bg-canvas" />
          ))}
        </div>
      </div>
    );
  }

  const selectedItem =
    data.stock.find((s) => s.group === selectedGroupCode) || data.stock[0];
  const compat =
    COMPATIBILITY_MAP[selectedItem?.group || "O_NEG"] ||
    COMPATIBILITY_MAP.O_NEG;
  const deficit = selectedItem
    ? Math.max(0, selectedItem.safeAt - selectedItem.units)
    : 0;

  return (
    <div className="space-y-4">
      {data.isStale && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-input border border-warn-ink/25 bg-warn-fill px-4 py-3 text-sm text-ink"
        >
          <TriangleAlert
            size={18}
            strokeWidth={1.9}
            className="mt-0.5 shrink-0 text-warn-ink"
            aria-hidden="true"
          />
          <span>
            Stok terakhir diperbarui {data.hoursElapsed} jam lalu. Angka mungkin
            sudah berubah.
          </span>
        </div>
      )}

      <div className="rounded-panel border border-line bg-white">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[19px] font-bold text-ink">
              Stok kantong darah saat ini
            </h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              {data.branch.name}. Pilih baris golongan darah untuk melihat
              kecocokan transfusi.
            </p>
          </div>
          <p className="text-xs font-medium text-ink-muted tabular-nums">
            {data.relativeUpdatedText}
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <div
            className={`grid gap-2 ${
              columns === 2
                ? "lg:grid-cols-2 lg:gap-x-6 lg:gap-y-2"
                : "grid-cols-1"
            }`}
          >
            {data.stock.map((item, idx) => {
              const isSelected = selectedItem?.group === item.group;
              return (
                <div
                  key={item.group}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedGroupCode(item.group)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedGroupCode(item.group);
                    }
                  }}
                  aria-pressed={isSelected}
                  className={`rounded-input border px-3 py-2.5 transition-colors duration-150 ${
                    isSelected
                      ? "border-brand bg-blush/50"
                      : "border-transparent hover:border-line hover:bg-canvas"
                  }`}
                >
                  <StockPill
                    group={item.display}
                    spoken={item.spoken}
                    units={item.units}
                    criticalAt={item.criticalAt}
                    safeAt={item.safeAt}
                    index={idx}
                  />
                </div>
              );
            })}
          </div>

          {selectedItem && (
            <div className="mt-4 rounded-panel border border-line bg-canvas p-4">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone="danger" Icon={Droplet}>
                      Golongan {selectedItem.display}
                    </Chip>
                    {deficit > 0 ? (
                      <Chip tone="warn">
                        Kurang {deficit} kantong dari batas aman (
                        {selectedItem.safeAt} kantong)
                      </Chip>
                    ) : (
                      <Chip tone="ok">
                        Memenuhi batas aman ({selectedItem.safeAt} kantong)
                      </Chip>
                    )}
                  </div>

                  <p className="text-sm text-ink-soft">{compat.note}</p>

                  <dl className="grid gap-2 pt-1 text-xs sm:grid-cols-2 sm:gap-6">
                    <div>
                      <dt className="text-ink-muted">Dapat diberikan ke</dt>
                      <dd className="mt-0.5 font-bold text-ink tabular-nums">
                        {compat.donateTo.join(", ")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">Dapat menerima dari</dt>
                      <dd className="mt-0.5 font-bold text-ink tabular-nums">
                        {compat.receiveFrom.join(", ")}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="flex shrink-0 items-center">
                  {mode === "coordinator" ? (
                    <Link
                      href={`/koordinator/permintaan/baru?group=${selectedItem.group}`}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong"
                    >
                      <CalendarClock size={16} aria-hidden="true" />
                      <span>
                        Buat permintaan golongan {selectedItem.display}
                      </span>
                    </Link>
                  ) : (
                    <Link
                      href="/#jadwal-utd"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong"
                    >
                      <CalendarClock size={16} aria-hidden="true" />
                      <span>Pesan jadwal donor {selectedItem.display}</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas/50 px-5 py-3 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-3.5 w-[2px] bg-ink"
            />
            <span>Garis tegak pada mistar menandai batas stok aman UTD</span>
          </span>
          <span>Data tersambung langsung dengan basis data UTD</span>
        </div>
      </div>
    </div>
  );
}
