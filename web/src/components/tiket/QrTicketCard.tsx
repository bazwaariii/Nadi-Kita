"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { CalendarClock, CheckCircle2, TriangleAlert, X } from "lucide-react";
import { BookingStatusChip } from "@/components/ui/StatusChip";

export interface QrTicketCardProps {
  bookingId: string;
  displayCode: string;
  qrPayload: string;
  dayDateLabel: string;
  timeLabel: string;
  branchName: string;
  donorName: string;
  bloodGroupDisplay: string;
  status: string;
  canCancel?: boolean;
}

/**
 * Tiket QR kedatangan pendonor.
 * Dirancang menyerupai kartu pas klinis yang bersih, mudah dipindai, tanpa panel gelap.
 */
export function QrTicketCard({
  bookingId,
  displayCode,
  qrPayload,
  dayDateLabel,
  timeLabel,
  branchName,
  donorName,
  bloodGroupDisplay,
  status,
  canCancel = true,
}: QrTicketCardProps) {
  const router = useRouter();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(qrPayload, {
      width: 224,
      margin: 2,
      color: {
        dark: "#1C1917",
        light: "#FFFFFF",
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [qrPayload]);

  async function handleCancelBooking() {
    setCancelling(true);
    setErrorMsg(null);
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "booking_cancel_opened",
          entityId: bookingId,
        }),
      }).catch(() => {});

      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(
          data?.error?.message || "Gagal membatalkan jadwal. Coba lagi."
        );
        setCancelling(false);
        return;
      }
      setConfirmOpen(false);
      setToastMsg("Jadwal dibatalkan");
      router.refresh();
    } catch {
      setErrorMsg("Koneksi terputus. Perubahan belum tersimpan. Coba lagi.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-4">
      {toastMsg && (
        <div
          role="status"
          className="fixed right-4 bottom-20 z-50 flex items-center gap-2.5 rounded-input border border-line bg-white px-4 py-3 text-sm font-bold text-ink shadow-[var(--shadow-float)] md:bottom-4"
        >
          <CheckCircle2
            size={18}
            className="shrink-0 text-ok-ink"
            aria-hidden="true"
          />
          <span>{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-input text-ink-soft hover:bg-canvas hover:text-ink"
            aria-label="Tutup pesan"
          >
            <X size={16} aria-hidden="true" />
          </button>
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

      <div className="overflow-hidden rounded-panel border border-line bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-bold text-ink">Tiket kehadiran donor</h2>
            <p className="mt-0.5 text-sm text-ink-muted">{branchName}</p>
          </div>
          <BookingStatusChip status={status} />
        </div>

        {/* Kode QR & kode tiket */}
        <div className="flex flex-col items-center border-b border-dashed border-line-strong bg-canvas/50 px-5 py-6">
          <div className="rounded-panel border border-line bg-white p-4">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`Kode QR tiket donor ${displayCode}`}
                width={224}
                height={224}
                className="h-[224px] w-[224px]"
              />
            ) : (
              <div className="flex h-[224px] w-[224px] items-center justify-center rounded-input bg-canvas text-sm text-ink-muted">
                Memuat QR...
              </div>
            )}
          </div>

          <p
            aria-label={`Kode tiket ${displayCode.split("").join(" ")}`}
            className="mt-3 text-2xl font-bold text-ink tabular-nums"
          >
            {displayCode}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Tunjukkan kode QR atau sebutkan kode di atas kepada petugas UTD
          </p>
        </div>

        {/* Rincian tiket */}
        <dl className="grid grid-cols-1 gap-4 px-5 py-4 text-sm sm:grid-cols-2 sm:px-6">
          <div>
            <dt className="text-ink-muted">Pendonor & golongan darah</dt>
            <dd className="mt-0.5 font-bold text-ink">
              {donorName} ({bloodGroupDisplay})
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Jadwal kedatangan</dt>
            <dd className="mt-0.5 font-bold text-ink tabular-nums">
              {dayDateLabel}, {timeLabel}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-ink-muted">Persiapan di lokasi</dt>
            <dd className="mt-0.5 text-ink-soft">
              Bawa kartu identitas (KTP atau SIM) dan datang 10 menit sebelum
              jadwal untuk pemeriksaan hemoglobin oleh petugas.
            </dd>
          </div>
        </dl>

        {status === "CONFIRMED" && (
          <div className="flex flex-col gap-2.5 border-t border-line bg-canvas/50 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
            <a
              href={`/api/tickets/${bookingId}/ics`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong"
            >
              <CalendarClock size={17} aria-hidden="true" />
              <span>Simpan ke kalender</span>
            </a>

            {canCancel && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="inline-flex h-11 items-center justify-center rounded-input border border-field bg-white px-4 text-sm font-bold text-ink transition-colors duration-150 hover:bg-canvas"
              >
                Batalkan jadwal
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal konfirmasi pembatalan */}
      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-cancel-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
        >
          <div className="w-full max-w-[480px] rounded-panel bg-white shadow-[var(--shadow-float)]">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 id="dialog-cancel-title" className="text-lg font-bold text-ink">
                Batalkan jadwal donor?
              </h3>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                aria-label="Tutup dialog"
                className="inline-flex h-10 w-10 items-center justify-center rounded-input text-ink-soft hover:bg-canvas hover:text-ink"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="px-5 py-4 text-sm text-ink-soft">
              Jadwal Anda pada{" "}
              <strong className="font-bold text-ink tabular-nums">
                {dayDateLabel}, {timeLabel}
              </strong>{" "}
              akan dilepas agar dapat dipilih oleh pendonor lain. Anda tetap
              dapat memilih jam baru selama memenuhi syarat.
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={cancelling}
                className="inline-flex h-10 items-center justify-center rounded-input border border-field bg-white px-4 text-sm font-bold text-ink hover:bg-canvas"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="inline-flex h-10 items-center justify-center rounded-input bg-brand px-4 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-60"
              >
                {cancelling ? "Membatalkan..." : "Batalkan jadwal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
