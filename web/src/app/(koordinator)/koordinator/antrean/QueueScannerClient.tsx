"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  QrCode,
  ScanLine,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  BLOOD_GROUP_META,
  BloodGroupCode,
  formatDateWIB,
  formatTimeWIB,
} from "@/lib/format-tanggal";
import { BookingStatusChip } from "@/components/ui/StatusChip";

export interface QueueBookingItem {
  id: string;
  code: string;
  displayCode: string;
  donorName: string;
  bloodGroupDisplay: string;
  status: string;
  outcomeNote: string | null;
}

export interface QueueSlotGroup {
  id: string;
  timeLabel: string;
  capacity: number;
  bookedCount: number;
  bookings: QueueBookingItem[];
}

interface ScannedResultState {
  bookingId: string;
  displayCode: string;
  donorName: string;
  bloodGroupDisplay: string;
  slotTimeLabel: string;
  status: string;
  message: string;
  nextEligibleAtText?: string;
}

export function QueueScannerClient({
  initialSlots,
}: {
  initialSlots: QueueSlotGroup[];
}) {
  const router = useRouter();
  const [manualCode, setManualCode] = useState("NK-4P8R2W6N");
  const [checkingIn, setCheckingIn] = useState(false);
  const [scanned, setScanned] = useState<ScannedResultState | null>(null);
  const [deferModalBookingId, setDeferModalBookingId] = useState<string | null>(
    null
  );
  const [deferReason, setDeferReason] = useState(
    "Kadar hemoglobin di lokasi belum mencapai 12,5 g/dL"
  );
  const [processingOutcome, setProcessingOutcome] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  async function handleCheckIn(codeOrQr: string) {
    setCheckingIn(true);
    setErrorMsg(null);
    setToastMsg(null);

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeOrQr }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(
          data?.error?.message || "Gagal memverifikasi tiket donor."
        );
        setCheckingIn(false);
        return;
      }

      const b = data.booking;
      const gDisplay =
        BLOOD_GROUP_META[b.donor.bloodGroup as BloodGroupCode]?.display ||
        b.donor.bloodGroup;

      setScanned({
        bookingId: b.id,
        displayCode: `NK-${b.code}`,
        donorName: b.donor.fullName,
        bloodGroupDisplay: gDisplay,
        slotTimeLabel: formatTimeWIB(b.slot.startsAt, true),
        status: b.status,
        message: data.message,
      });

      setToastMsg(data.message);
      router.refresh();
    } catch {
      setErrorMsg("Koneksi terputus. Perubahan belum tersimpan. Coba lagi.");
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleOutcome(
    bookingId: string,
    outcome: "COMPLETED" | "DEFERRED",
    note?: string
  ) {
    setProcessingOutcome(true);
    setErrorMsg(null);
    setToastMsg(null);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(
          data?.error?.message || "Gagal mencatat hasil donor."
        );
        setProcessingOutcome(false);
        return;
      }

      const b = data.booking;
      const gDisplay =
        BLOOD_GROUP_META[b.donor.bloodGroup as BloodGroupCode]?.display ||
        b.donor.bloodGroup;

      setScanned({
        bookingId: b.id,
        displayCode: `NK-${b.code}`,
        donorName: b.donor.fullName,
        bloodGroupDisplay: gDisplay,
        slotTimeLabel: formatTimeWIB(b.slot.startsAt, true),
        status: b.status,
        message:
          outcome === "COMPLETED"
            ? "Selesai donor tercatat. Timer masa jeda 60 hari dimulai ulang."
            : "Donor ditunda. Timer masa jeda tidak direset.",
        nextEligibleAtText: b.donor.nextEligibleAt
          ? formatDateWIB(b.donor.nextEligibleAt)
          : undefined,
      });

      setDeferModalBookingId(null);
      setToastMsg(
        outcome === "COMPLETED"
          ? "Selesai donor tercatat (masa jeda 60 hari dimulai ulang)"
          : "Donor ditandai ditunda"
      );
      router.refresh();
    } catch {
      setErrorMsg("Koneksi terputus. Perubahan belum tersimpan. Coba lagi.");
    } finally {
      setProcessingOutcome(false);
    }
  }

  return (
    <div className="space-y-6">
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

      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Kolom kiri: Pemindai QR + input kode manual + hasil */}
        <section
          aria-label="Pemindai tiket donor"
          className="rounded-panel border border-line bg-white lg:col-span-5"
        >
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-[17px] font-bold text-ink">Pemindai tiket</h2>
          </div>

          <div className="space-y-4 p-4">
            <div className="flex flex-col items-center justify-center rounded-panel border border-dashed border-line-strong bg-canvas p-5 text-center">
              <ScanLine
                size={36}
                className="text-brand-strong"
                aria-hidden="true"
              />
              <p className="mt-2 text-sm font-bold text-ink">
                Arahkan pemindai ke tiket QR pendonor
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                Pilih contoh tiket di bawah atau ketik kode tiket 8 karakter
              </p>

              <div className="mt-3.5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCheckIn("NK-4P8R2W6N")}
                  className="inline-flex h-10 items-center gap-1.5 rounded-input border border-field bg-white px-3 text-xs font-bold text-ink hover:bg-canvas tabular-nums"
                >
                  <QrCode size={14} aria-hidden="true" />
                  <span>Pindai Sari W. (NK-4P8R2W6N)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCheckIn("NK-7H3K9Q2M")}
                  className="inline-flex h-10 items-center gap-1.5 rounded-input border border-field bg-white px-3 text-xs font-bold text-ink hover:bg-canvas tabular-nums"
                >
                  <QrCode size={14} aria-hidden="true" />
                  <span>Pindai Dimas S. (NK-7H3K9Q2M)</span>
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCheckIn(manualCode);
              }}
              className="space-y-1.5"
            >
              <label
                htmlFor="manual-ticket-code"
                className="block text-sm font-bold text-ink"
              >
                Masukkan kode tiket manual
              </label>
              <div className="flex gap-2">
                <input
                  id="manual-ticket-code"
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="NK-7H3K9Q2M"
                  className="h-10 flex-1 rounded-input border border-field bg-white px-3 text-base font-bold text-ink tabular-nums focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={checkingIn}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong disabled:opacity-60"
                >
                  {checkingIn ? "Mengecek..." : "Verifikasi"}
                </button>
              </div>
            </form>

            {scanned && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-panel border border-brand/30 bg-blush/50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-ink-muted tabular-nums">
                      {scanned.displayCode}, sesi {scanned.slotTimeLabel}
                    </p>
                    <h3 className="mt-0.5 text-lg font-bold text-ink">
                      {scanned.donorName} ({scanned.bloodGroupDisplay})
                    </h3>
                  </div>
                  <BookingStatusChip status={scanned.status} />
                </div>

                <p className="mt-2 text-sm text-ink-soft">{scanned.message}</p>

                {scanned.nextEligibleAtText && (
                  <p className="mt-1 text-xs font-bold text-brand-strong tabular-nums">
                    Boleh donor kembali mulai {scanned.nextEligibleAtText}
                  </p>
                )}

                {(scanned.status === "CHECKED_IN" ||
                  scanned.status === "CONFIRMED") && (
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={processingOutcome}
                      onClick={() =>
                        handleOutcome(scanned.bookingId, "COMPLETED")
                      }
                      className="inline-flex h-10 items-center justify-center rounded-input bg-brand px-3.5 text-xs font-bold text-white hover:bg-brand-strong"
                    >
                      Catat selesai donor
                    </button>
                    <button
                      type="button"
                      disabled={processingOutcome}
                      onClick={() => setDeferModalBookingId(scanned.bookingId)}
                      className="inline-flex h-10 items-center justify-center rounded-input border border-field bg-white px-3.5 text-xs font-bold text-ink hover:bg-canvas"
                    >
                      Tandai ditunda
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Kolom kanan: Jadwal per slot */}
        <section
          aria-label="Jadwal kedatangan per slot"
          className="rounded-panel border border-line bg-white lg:col-span-7"
        >
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-[17px] font-bold text-ink">
              Daftar antrean per sesi 30 menit
            </h2>
          </div>

          <div className="p-4">
            {initialSlots.length === 0 ? (
              <p className="py-4 text-sm text-ink-soft">
                Belum ada jadwal untuk hari ini.
              </p>
            ) : (
              <div className="space-y-4">
                {initialSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="rounded-panel border border-line bg-canvas p-3.5"
                  >
                    <div className="flex items-center justify-between border-b border-line pb-2 text-sm tabular-nums">
                      <span className="font-bold text-ink">
                        {slot.timeLabel}
                      </span>
                      <span className="text-xs font-bold text-ink-muted">
                        {slot.bookedCount} dari {slot.capacity} kursi terisi
                      </span>
                    </div>

                    {slot.bookings.length === 0 ? (
                      <p className="pt-2.5 text-xs text-ink-muted">
                        Belum ada pendonor terjadwal pada jam ini.
                      </p>
                    ) : (
                      <ul className="mt-2.5 space-y-2">
                        {slot.bookings.map((b) => (
                          <li
                            key={b.id}
                            className="flex flex-wrap items-center justify-between gap-2.5 rounded-input border border-line bg-white px-3 py-2.5"
                          >
                            <div>
                              <p className="text-sm font-bold text-ink">
                                {b.donorName}{" "}
                                <span className="font-medium text-ink-soft">
                                  ({b.bloodGroupDisplay})
                                </span>
                              </p>
                              <p className="text-xs text-ink-muted tabular-nums">
                                {b.displayCode}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <BookingStatusChip status={b.status} />

                              {b.status === "CONFIRMED" && (
                                <button
                                  type="button"
                                  onClick={() => handleCheckIn(b.displayCode)}
                                  className="inline-flex h-9 items-center justify-center rounded-input border border-field bg-white px-3 text-xs font-bold text-ink hover:bg-canvas"
                                >
                                  Catat hadir
                                </button>
                              )}

                              {b.status === "CHECKED_IN" && (
                                <>
                                  <button
                                    type="button"
                                    disabled={processingOutcome}
                                    onClick={() =>
                                      handleOutcome(b.id, "COMPLETED")
                                    }
                                    className="inline-flex h-9 items-center justify-center rounded-input bg-brand px-3 text-xs font-bold text-white hover:bg-brand-strong"
                                  >
                                    Selesai donor
                                  </button>
                                  <button
                                    type="button"
                                    disabled={processingOutcome}
                                    onClick={() => setDeferModalBookingId(b.id)}
                                    className="inline-flex h-9 items-center justify-center rounded-input border border-field bg-white px-3 text-xs font-bold text-ink hover:bg-canvas"
                                  >
                                    Ditunda
                                  </button>
                                </>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modal alasan penundaan */}
      {deferModalBookingId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-defer-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
        >
          <div className="w-full max-w-[480px] rounded-panel bg-white shadow-[var(--shadow-float)]">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 id="dialog-defer-title" className="text-lg font-bold text-ink">
                Tandai donor ditunda
              </h3>
              <button
                type="button"
                onClick={() => setDeferModalBookingId(null)}
                aria-label="Tutup dialog"
                className="inline-flex h-10 w-10 items-center justify-center rounded-input text-ink-soft hover:bg-canvas hover:text-ink"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <p className="text-sm text-ink-soft">
                Pendonor yang ditunda saat pemeriksaan di lokasi tidak akan
                direset masa jeda 60 harinya.
              </p>
              <div>
                <label
                  htmlFor="defer-reason-input"
                  className="block text-sm font-bold text-ink"
                >
                  Alasan penundaan
                </label>
                <input
                  id="defer-reason-input"
                  type="text"
                  value={deferReason}
                  onChange={(e) => setDeferReason(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-input border border-field bg-white px-3 text-sm text-ink focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
              <button
                type="button"
                onClick={() => setDeferModalBookingId(null)}
                className="inline-flex h-10 items-center justify-center rounded-input border border-field bg-white px-4 text-sm font-bold text-ink hover:bg-canvas"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={processingOutcome}
                onClick={() =>
                  handleOutcome(deferModalBookingId, "DEFERRED", deferReason)
                }
                className="inline-flex h-10 items-center justify-center rounded-input bg-brand px-4 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-60"
              >
                Simpan penundaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
