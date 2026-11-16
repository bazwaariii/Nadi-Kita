import { formatTimeWIB } from "@/lib/format-tanggal";
import {
  DEFAULT_ELIGIBILITY_CONFIG,
  EligibilityConfig,
} from "@/server/rules/eligibility";

const MS_PER_MIN = 60 * 1000;

/**
 * BR-09: Memeriksa apakah slot masih bisa dipesan pada waktu `now`
 */
export function evaluateSlotBookability(
  slot: { startsAt: Date; capacity: number; bookedCount: number },
  now: Date = new Date(),
  config: EligibilityConfig = DEFAULT_ELIGIBILITY_CONFIG
): { bookable: boolean; reasonCode?: "SLOT_FULL" | "TOO_LATE"; message?: string } {
  if (slot.bookedCount >= slot.capacity) {
    return {
      bookable: false,
      reasonCode: "SLOT_FULL",
      message: `Jam ${formatTimeWIB(slot.startsAt)} baru saja penuh. Pilih jam lain di bawah.`,
    };
  }

  const minLeadMs = config.bookBeforeMin * MS_PER_MIN;
  if (slot.startsAt.getTime() - now.getTime() < minLeadMs) {
    return {
      bookable: false,
      reasonCode: "TOO_LATE",
      message: `Pemesanan untuk jam ${formatTimeWIB(slot.startsAt)} sudah ditutup (minimal ${config.bookBeforeMin} menit sebelum jadwal).`,
    };
  }

  return { bookable: true };
}

/**
 * BR-10: Pembatalan boleh sampai cancelBeforeMin menit sebelum slot dimulai
 */
export function evaluateCancellationAllowed(
  slotStartsAt: Date,
  now: Date = new Date(),
  config: EligibilityConfig = DEFAULT_ELIGIBILITY_CONFIG
): { allowed: boolean; message?: string } {
  const minCancelMs = config.cancelBeforeMin * MS_PER_MIN;
  if (slotStartsAt.getTime() - now.getTime() < minCancelMs) {
    return {
      allowed: false,
      message: `Jadwal hanya dapat dibatalkan paling lambat ${Math.round(config.cancelBeforeMin / 60)} jam sebelum jam kedatangan. Hubungi petugas UTD bila Anda berhalangan mendadak.`,
    };
  }
  return { allowed: true };
}

/**
 * BR-11: Check-in valid dari `before` menit sebelum sampai `after` menit sesudah awal slot.
 * Pesan sesuai design.md Bagian 9.3: "Tiket ini untuk 09.30. Check-in dibuka mulai 09.00."
 */
export function evaluateCheckInWindow(
  slotStartsAt: Date,
  now: Date = new Date(),
  config: EligibilityConfig = DEFAULT_ELIGIBILITY_CONFIG
): {
  valid: boolean;
  reason?: "TOO_EARLY" | "TOO_LATE";
  message?: string;
} {
  const windowOpen = new Date(
    slotStartsAt.getTime() - config.checkInWindowMin.before * MS_PER_MIN
  );
  const windowClose = new Date(
    slotStartsAt.getTime() + config.checkInWindowMin.after * MS_PER_MIN
  );

  const slotTime = formatTimeWIB(slotStartsAt);
  const openTime = formatTimeWIB(windowOpen);
  const closeTime = formatTimeWIB(windowClose);

  if (now.getTime() < windowOpen.getTime()) {
    return {
      valid: false,
      reason: "TOO_EARLY",
      message: `Tiket ini untuk ${slotTime}. Check-in dibuka mulai ${openTime}.`,
    };
  }

  if (now.getTime() > windowClose.getTime()) {
    return {
      valid: false,
      reason: "TOO_LATE",
      message: `Tiket ini untuk ${slotTime}. Batas waktu check-in berakhir pada ${closeTime}.`,
    };
  }

  return { valid: true };
}

/**
 * Bagian 5.3: NO_SHOW dihitung secara lazy saat data dibaca (slot berakhir + toleransi)
 */
export function computeEffectiveBookingStatus<T extends string>(
  status: T,
  slotStartsAt: Date,
  now: Date = new Date(),
  config: EligibilityConfig = DEFAULT_ELIGIBILITY_CONFIG
): T | "NO_SHOW" {
  if (status !== "CONFIRMED") {
    return status;
  }
  const cutoff =
    slotStartsAt.getTime() +
    Math.max(config.slot.minutes, config.checkInWindowMin.after) * MS_PER_MIN;
  if (now.getTime() > cutoff) {
    return "NO_SHOW";
  }
  return status;
}

