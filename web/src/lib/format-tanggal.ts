export type BloodGroupCode =
  | "A_POS"
  | "B_POS"
  | "O_POS"
  | "AB_POS"
  | "A_NEG"
  | "B_NEG"
  | "O_NEG"
  | "AB_NEG";

/**
 * Urutan tetap sesuai design.md Bagian 6.5:
 * A+, B+, O+, AB+, A−, B−, O−, AB−
 */
export const BLOOD_GROUP_ORDER: BloodGroupCode[] = [
  "A_POS",
  "B_POS",
  "O_POS",
  "AB_POS",
  "A_NEG",
  "B_NEG",
  "O_NEG",
  "AB_NEG",
];

/**
 * Menggunakan tanda minus sebenarnya U+2212 (−) sesuai design.md Bagian 4.3
 */
export const BLOOD_GROUP_META: Record<
  BloodGroupCode,
  { display: string; spoken: string; ascii: string }
> = {
  A_POS: { display: "A+", spoken: "A positif", ascii: "A+" },
  B_POS: { display: "B+", spoken: "B positif", ascii: "B+" },
  O_POS: { display: "O+", spoken: "O positif", ascii: "O+" },
  AB_POS: { display: "AB+", spoken: "AB positif", ascii: "AB+" },
  A_NEG: { display: "A\u2212", spoken: "A negatif", ascii: "A-" },
  B_NEG: { display: "B\u2212", spoken: "B negatif", ascii: "B-" },
  O_NEG: { display: "O\u2212", spoken: "O negatif", ascii: "O-" },
  AB_NEG: { display: "AB\u2212", spoken: "AB negatif", ascii: "AB-" },
};

const MONTHS_SHORT_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const DAYS_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

function toWIBParts(input: Date | string): {
  year: number;
  monthIndex: number;
  day: number;
  weekdayIndex: number;
  hour: number;
  minute: number;
} {
  const d = typeof input === "string" ? new Date(input) : input;
  // Geser ke UTC+7 (Asia/Jakarta, WIB)
  const wibMs = d.getTime() + 7 * 60 * 60 * 1000;
  const wib = new Date(wibMs);
  return {
    year: wib.getUTCFullYear(),
    monthIndex: wib.getUTCMonth(),
    day: wib.getUTCDate(),
    weekdayIndex: wib.getUTCDay(),
    hour: wib.getUTCHours(),
    minute: wib.getUTCMinutes(),
  };
}

/**
 * Format tanggal pendek sesuai design.md Bagian 4.3 & 9.4: "18 Nov 2026"
 */
export function formatDateWIB(input: Date | string): string {
  const { day, monthIndex, year } = toWIBParts(input);
  return `${day} ${MONTHS_SHORT_ID[monthIndex]} ${year}`;
}

/**
 * Format tanggal tanpa tahun: "18 Nov"
 */
export function formatShortDateWIB(input: Date | string): string {
  const { day, monthIndex } = toWIBParts(input);
  return `${day} ${MONTHS_SHORT_ID[monthIndex]}`;
}

/**
 * Format hari + tanggal: "Rabu 18 Nov 2026"
 */
export function formatDayDateWIB(input: Date | string): string {
  const { weekdayIndex, day, monthIndex, year } = toWIBParts(input);
  return `${DAYS_ID[weekdayIndex]} ${day} ${MONTHS_SHORT_ID[monthIndex]} ${year}`;
}

/**
 * Format jam dengan titik sesuai kebiasaan Indonesia (design.md 4.3): "09.30" atau "09.30 WIB"
 */
export function formatTimeWIB(
  input: Date | string,
  withZone: boolean = false
): string {
  const { hour, minute } = toWIBParts(input);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return withZone ? `${hh}.${mm} WIB` : `${hh}.${mm}`;
}

/**
 * Format selisih waktu pembaruan: "Diperbarui 3 menit lalu"
 */
export function formatRelativeTimeID(
  updatedAt: Date | string,
  now: Date = new Date()
): { text: string; isStale: boolean; hoursElapsed: number } {
  const updated = typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  const diffMs = Math.max(0, now.getTime() - updated.getTime());
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = diffMs / (3600 * 1000);

  if (diffMin < 1) {
    return {
      text: "Diperbarui baru saja",
      isStale: false,
      hoursElapsed: 0,
    };
  }
  if (diffMin < 60) {
    return {
      text: `Diperbarui ${diffMin} menit lalu`,
      isStale: false,
      hoursElapsed: Math.floor(diffHours),
    };
  }
  const h = Math.floor(diffHours);
  if (h < 24) {
    return {
      text: `Diperbarui ${h} jam lalu`,
      isStale: diffHours >= 6,
      hoursElapsed: h,
    };
  }
  const days = Math.floor(h / 24);
  return {
    text: `Diperbarui ${days} hari lalu`,
    isStale: true,
    hoursElapsed: h,
  };
}

/**
 * Format angka ribuan dengan titik ("1.250")
 */
export function formatNumberID(num: number): string {
  return Math.round(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Format desimal dengan koma ("12,5" atau "0,52")
 */
export function formatDecimalID(num: number, decimals: number = 2): string {
  return num.toFixed(decimals).replace(".", ",");
}

