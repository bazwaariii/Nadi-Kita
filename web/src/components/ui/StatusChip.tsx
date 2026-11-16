import {
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Send,
  TrendingDown,
  TriangleAlert,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Chip status bersama. Status selalu = ikon + teks + warna (MASTER.md bagian 2).
 * Nada: ok (hijau), warn (kuning tua), danger (merah darah), brand, neutral.
 */
type Tone = "ok" | "warn" | "danger" | "brand" | "neutral" | "info";

const TONE: Record<Tone, string> = {
  ok: "border-ok-ink/25 bg-ok-fill text-ok-ink",
  warn: "border-warn-ink/25 bg-warn-fill text-warn-ink",
  danger: "border-brand bg-brand text-white",
  brand: "border-brand/30 bg-blush text-brand-strong",
  neutral: "border-line-strong bg-white text-ink-soft",
  info: "border-line-strong bg-canvas text-ink",
};

export function Chip({
  tone,
  Icon,
  children,
  size = "md",
}: {
  tone: Tone;
  Icon?: LucideIcon;
  children: React.ReactNode;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-input border font-bold whitespace-nowrap ${
        size === "sm" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-[13px]"
      } ${TONE[tone]}`}
    >
      {Icon && (
        <Icon
          size={size === "sm" ? 12 : 14}
          strokeWidth={2}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export type StockStatusLevel = "critical" | "low" | "ok";

export function StockStatusChip({ level }: { level: StockStatusLevel }) {
  if (level === "critical") {
    return (
      <Chip tone="danger" Icon={TriangleAlert}>
        Kritis
      </Chip>
    );
  }
  if (level === "low") {
    return (
      <Chip tone="warn" Icon={TrendingDown}>
        Menipis
      </Chip>
    );
  }
  return (
    <Chip tone="ok" Icon={Check}>
      Aman
    </Chip>
  );
}

export function BookingStatusChip({ status }: { status: string }) {
  switch (status) {
    case "CONFIRMED":
      return (
        <Chip tone="brand" Icon={CalendarClock}>
          Terjadwal
        </Chip>
      );
    case "CHECKED_IN":
      return (
        <Chip tone="info" Icon={Check}>
          Hadir
        </Chip>
      );
    case "COMPLETED":
      return (
        <Chip tone="ok" Icon={CheckCircle2}>
          Selesai donor
        </Chip>
      );
    case "DEFERRED":
      return (
        <Chip tone="warn" Icon={Clock}>
          Ditunda
        </Chip>
      );
    case "NO_SHOW":
      return (
        <Chip tone="neutral" Icon={X}>
          Tidak hadir
        </Chip>
      );
    case "CANCELLED":
    default:
      return (
        <Chip tone="neutral" Icon={X}>
          Dibatalkan
        </Chip>
      );
  }
}

export function InvitationStatusChip({ status }: { status: string }) {
  switch (status) {
    case "BOOKED":
      return (
        <Chip tone="ok" Icon={Check}>
          Dipesan
        </Chip>
      );
    case "SCREENED_OK":
      return (
        <Chip tone="brand" Icon={ClipboardCheck}>
          Lolos periksa
        </Chip>
      );
    case "SCREENED_NOT_ELIGIBLE":
      return (
        <Chip tone="warn" Icon={Clock}>
          Belum memenuhi
        </Chip>
      );
    case "OPENED":
      return (
        <Chip tone="info" Icon={Clock}>
          Dibuka
        </Chip>
      );
    case "EXPIRED":
      return (
        <Chip tone="neutral" Icon={X}>
          Kedaluwarsa
        </Chip>
      );
    case "DECLINED":
      return (
        <Chip tone="neutral" Icon={X}>
          Ditolak
        </Chip>
      );
    case "SENT":
    case "QUEUED":
    default:
      return (
        <Chip tone="neutral" Icon={Send}>
          Terkirim
        </Chip>
      );
  }
}
