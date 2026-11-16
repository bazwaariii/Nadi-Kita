"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, TriangleAlert, X } from "lucide-react";

export interface DirectSlotOption {
  id: string;
  dayKey: string;
  dayLabel: string;
  timeLabel: string;
  remaining: number;
  capacity: number;
}

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setCancelling(false);
    }
  }

  return (
    <button
      type="button"
      disabled={cancelling}
      onClick={handleCancel}
      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-input border border-field bg-white px-4 text-sm font-bold text-ink transition-colors duration-150 hover:border-danger-ink hover:bg-danger-fill hover:text-danger-ink"
    >
      <X size={16} aria-hidden="true" />
      <span>{cancelling ? "Membatalkan..." : "Batalkan jadwal"}</span>
    </button>
  );
}

export function DirectBookingClient({
  donorId,
  slots,
  initialSlotId,
}: {
  donorId: string;
  slots: DirectSlotOption[];
  initialSlotId?: string;
}) {
  const router = useRouter();
  const days = Array.from(new Set(slots.map((s) => s.dayKey)));
  const initialSlot = initialSlotId
    ? slots.find((s) => s.id === initialSlotId)
    : undefined;
  const [selectedDay, setSelectedDay] = useState<string>(
    initialSlot?.dayKey || days[0] || ""
  );
  const visibleSlots = slots.filter((s) => s.dayKey === selectedDay);

  const [selectedSlotId, setSelectedSlotId] = useState<string>(
    initialSlot?.id || slots[0]?.id || ""
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleBookNow() {
    if (!selectedSlotId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selectedSlotId,
          donorId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error?.message || "Gagal memesan jadwal donor.");
        setLoading(false);
        return;
      }
      const bookingId = data?.booking?.id;
      if (bookingId) {
        router.push(`/donor/tiket/${bookingId}`);
      } else {
        router.refresh();
      }
    } catch {
      setErrorMsg("Koneksi terputus. Silakan coba lagi.");
      setLoading(false);
    }
  }

  if (slots.length === 0) return null;

  return (
    <section
      aria-labelledby="heading-direct-book"
      className="rounded-panel border border-line bg-white p-5 sm:p-6"
    >
      <div>
        <h2 id="heading-direct-book" className="text-xl font-bold text-ink">
          Pesan jadwal kedatangan di UTD
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Pilih tanggal dan jam sesi 30 menit yang tersedia di UTD PMI Kota
          Surabaya untuk menerbitkan tiket QR Anda.
        </p>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-input border border-brand/30 bg-blush p-3.5 text-sm text-ink"
        >
          <TriangleAlert
            size={18}
            className="mt-0.5 shrink-0 text-brand-strong"
            aria-hidden="true"
          />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Pilihan hari */}
      <div
        role="tablist"
        aria-label="Pilih tanggal donor"
        className="mt-4 flex gap-1.5 overflow-x-auto rounded-input border border-line bg-canvas p-1"
      >
        {days.map((day) => {
          const active = selectedDay === day;
          return (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setSelectedDay(day);
                const firstInDay = slots.find((s) => s.dayKey === day);
                if (firstInDay) setSelectedSlotId(firstInDay.id);
              }}
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

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
        {visibleSlots.map((slot) => {
          const isSelected = selectedSlotId === slot.id;
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => setSelectedSlotId(slot.id)}
              aria-pressed={isSelected}
              className={`flex min-h-[60px] flex-col items-start justify-between rounded-input border p-3 text-left tabular-nums transition-colors duration-150 ${
                isSelected
                  ? "border-2 border-brand bg-blush text-ink"
                  : "border-field bg-white text-ink hover:bg-canvas"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-base font-bold">{slot.timeLabel}</span>
                {isSelected && (
                  <CheckCircle2
                    size={16}
                    className="text-brand-strong"
                    aria-hidden="true"
                  />
                )}
              </div>
              <span
                className={`mt-1.5 text-xs font-bold ${
                  isSelected ? "text-brand-strong" : "text-ok-ink"
                }`}
              >
                Sisa {slot.remaining} kursi
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-xs text-ink-muted">
          Tiket QR langsung aktif setelah jadwal dikonfirmasi.
        </p>
        <button
          type="button"
          disabled={loading || !selectedSlotId}
          onClick={handleBookNow}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong disabled:opacity-60"
        >
          <CalendarClock size={17} aria-hidden="true" />
          <span>
            {loading ? "Menerbitkan tiket QR..." : "Konfirmasi jadwal"}
          </span>
        </button>
      </div>
    </section>
  );
}
