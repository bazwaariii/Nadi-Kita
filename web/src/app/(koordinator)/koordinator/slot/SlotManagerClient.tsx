"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, CheckCircle2, Minus, Plus } from "lucide-react";

export interface SlotManageRow {
  id: string;
  dayKey: string;
  dayLabel: string;
  timeLabel: string;
  capacity: number;
  bookedCount: number;
}

export function SlotManagerClient({
  initialSlots,
}: {
  initialSlots: SlotManageRow[];
}) {
  const router = useRouter();
  const [slots, setSlots] = useState(initialSlots);
  const days = Array.from(new Set(slots.map((s) => s.dayKey)));
  const [selectedDay, setSelectedDay] = useState(days[0] || "");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const todayIso = new Date().toISOString().split("T")[0];
  const [newDate, setNewDate] = useState(todayIso);
  const [newTime, setNewTime] = useState("13:00");
  const [newCapacity, setNewCapacity] = useState(4);
  const [addingSlot, setAddingSlot] = useState(false);

  async function handleUpdateCapacity(slotId: string, newCap: number) {
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, capacity: newCap } : s))
    );
    const res = await fetch("/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, capacity: newCap }),
    });
    if (res.ok) {
      setToastMsg("Kapasitas jadwal diperbarui");
      router.refresh();
    }
  }

  async function handleCreateSlot(e: React.FormEvent) {
    e.preventDefault();
    setAddingSlot(true);
    setToastMsg(null);
    try {
      const startsAtIso = new Date(
        `${newDate}T${newTime}:00+07:00`
      ).toISOString();
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: startsAtIso,
          capacity: newCapacity,
        }),
      });
      if (res.ok) {
        setToastMsg(
          `Jadwal baru pada ${newDate} pukul ${newTime} WIB dibuka`
        );
        window.location.reload();
      }
    } finally {
      setAddingSlot(false);
    }
  }

  const visibleSlots = slots.filter((s) => s.dayKey === selectedDay);

  return (
    <div className="space-y-5">
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

      {/* Formulir buka jadwal baru */}
      <form
        onSubmit={handleCreateSlot}
        className="rounded-panel border border-line bg-white p-4"
      >
        <div className="flex items-center gap-2">
          <CalendarPlus
            size={18}
            className="text-brand-strong"
            aria-hidden="true"
          />
          <h2 className="text-[17px] font-bold text-ink">
            Buka jadwal 30 menit baru
          </h2>
        </div>
        <p className="mt-0.5 text-sm text-ink-muted">
          Tambahkan sesi jam layanan baru apabila kuota kursi yang ada sudah
          penuh.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div>
            <label
              htmlFor="slot-date"
              className="block text-sm font-bold text-ink"
            >
              Tanggal layanan
            </label>
            <input
              id="slot-date"
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-1 h-10 w-full rounded-input border border-field bg-white px-3 text-sm text-ink tabular-nums focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="slot-time"
              className="block text-sm font-bold text-ink"
            >
              Jam mulai (WIB)
            </label>
            <input
              id="slot-time"
              type="time"
              required
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="mt-1 h-10 w-full rounded-input border border-field bg-white px-3 text-sm text-ink tabular-nums focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="slot-cap"
              className="block text-sm font-bold text-ink"
            >
              Kapasitas kursi
            </label>
            <input
              id="slot-cap"
              type="number"
              min={1}
              max={20}
              required
              value={newCapacity}
              onChange={(e) => setNewCapacity(Number(e.target.value) || 4)}
              className="mt-1 h-10 w-full rounded-input border border-field bg-white px-3 text-sm text-ink tabular-nums focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={addingSlot}
              className="inline-flex h-10 w-full items-center justify-center rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong disabled:opacity-60"
            >
              {addingSlot ? "Menambahkan..." : "Tambah jadwal"}
            </button>
          </div>
        </div>
      </form>

      {/* Tab pilihan hari */}
      <div
        role="tablist"
        aria-label="Pilih tanggal jadwal"
        className="flex gap-1.5 overflow-x-auto rounded-input border border-line bg-canvas p-1"
      >
        {days.map((day) => {
          const active = selectedDay === day;
          return (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedDay(day)}
              className={`h-9 shrink-0 rounded-[6px] px-3.5 text-sm transition-colors duration-150 ${
                active
                  ? "bg-white font-bold text-ink shadow-[0_1px_2px_rgba(28,25,23,0.08)]"
                  : "font-medium text-ink-soft hover:text-ink"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Tabel jadwal */}
      <div className="overflow-x-auto rounded-panel border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line-strong bg-canvas">
              <th className="h-10 px-3 text-[13px] font-bold text-ink-soft">
                Hari
              </th>
              <th className="h-10 px-3 text-[13px] font-bold text-ink-soft">
                Jam (WIB)
              </th>
              <th className="h-10 px-3 text-[13px] font-bold text-ink-soft">
                Keterisian kursi
              </th>
              <th className="h-10 px-3 text-right text-[13px] font-bold text-ink-soft">
                Kapasitas
              </th>
              <th className="h-10 px-3 text-right text-[13px] font-bold text-ink-soft">
                Ubah kapasitas
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleSlots.map((slot) => {
              const pct = Math.min(
                100,
                Math.round((slot.bookedCount / Math.max(1, slot.capacity)) * 100)
              );
              return (
                <tr
                  key={slot.id}
                  className="border-b border-line last:border-b-0 hover:bg-canvas/70"
                >
                  <td className="px-3 py-2.5 text-ink-soft">{slot.dayLabel}</td>
                  <td className="px-3 py-2.5 font-bold text-ink tabular-nums">
                    {slot.timeLabel}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex max-w-[200px] items-center gap-2.5 tabular-nums">
                      <div className="h-2 flex-1 overflow-hidden rounded-input bg-canvas">
                        <div
                          className={`h-full ${
                            pct >= 100 ? "bg-brand" : "bg-ok-ink"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-ink-soft">
                        {slot.bookedCount}/{slot.capacity}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-ink tabular-nums">
                    {slot.capacity} kursi
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={slot.capacity <= slot.bookedCount}
                        onClick={() =>
                          handleUpdateCapacity(
                            slot.id,
                            Math.max(slot.bookedCount, slot.capacity - 1)
                          )
                        }
                        className="inline-flex h-10 w-10 items-center justify-center rounded-input border border-field bg-white text-ink hover:bg-canvas disabled:opacity-40"
                        aria-label={`Kurangi kapasitas jam ${slot.timeLabel}`}
                      >
                        <Minus size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateCapacity(slot.id, slot.capacity + 1)
                        }
                        className="inline-flex h-10 w-10 items-center justify-center rounded-input border border-field bg-white text-ink hover:bg-canvas"
                        aria-label={`Tambah kapasitas jam ${slot.timeLabel}`}
                      >
                        <Plus size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
