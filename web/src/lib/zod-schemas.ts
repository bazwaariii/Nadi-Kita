import { z } from "zod";

export const BloodGroupEnum = z.enum([
  "A_POS",
  "A_NEG",
  "B_POS",
  "B_NEG",
  "AB_POS",
  "AB_NEG",
  "O_POS",
  "O_NEG",
]);

export const HbStatusEnum = z.enum(["OK", "LOW", "UNKNOWN"]);

export const PatchStockSchema = z.object({
  units: z
    .number({ invalid_type_error: "Jumlah kantong harus berupa angka." })
    .int("Jumlah kantong harus bilangan bulat.")
    .min(0, "Jumlah kantong tidak boleh negatif."),
  criticalAt: z.number().int().min(0).optional(),
  safeAt: z.number().int().min(1).optional(),
  reason: z
    .string()
    .min(3, "Tuliskan alasan pembaruan stok minimal 3 karakter.")
    .max(200)
    .default("Pembaruan stok harian oleh koordinator"),
});

export const CampaignPreviewSchema = z.object({
  group: BloodGroupEnum,
  targetUnits: z
    .number({ invalid_type_error: "Target kantong harus berupa angka." })
    .int()
    .min(1, "Target minimal 1 kantong.")
    .max(100, "Target maksimal 100 kantong per permintaan."),
  deadlineAt: z.string().min(8, "Pilih tanggal batas waktu permintaan."),
  cohortFilter: z.string().nullable().optional(),
  customInviteCount: z.number().int().min(1).max(200).nullable().optional(),
});

export const CreateCampaignSchema = CampaignPreviewSchema;

export const ScreeningSubmitSchema = z.object({
  weightKg: z
    .number({ invalid_type_error: "Masukkan berat badan dalam angka (kg)." })
    .min(25, "Periksa kembali berat badan yang dimasukkan.")
    .max(250, "Periksa kembali berat badan yang dimasukkan."),
  sleepHours: z
    .number({ invalid_type_error: "Masukkan lama tidur dalam angka (jam)." })
    .min(0, "Jam tidur tidak boleh negatif.")
    .max(24, "Jam tidur maksimal 24 jam."),
  hbStatus: HbStatusEnum,
  lastDonationConfirmedAt: z.string().nullable().optional(),
});

export const CreateBookingSchema = z.object({
  slotId: z.string().min(1, "Pilih jam kedatangan terlebih dahulu."),
  token: z.string().optional(),
  donorId: z.string().optional(),
});

export const CheckInSchema = z.object({
  qrPayload: z.string().optional(),
  code: z.string().optional(),
});

export const BookingOutcomeSchema = z.object({
  outcome: z.enum(["COMPLETED", "DEFERRED"]),
  note: z.string().max(300).optional(),
});

export const EventLogSchema = z.object({
  name: z.string().min(1).max(100),
  entityId: z.string().optional(),
  sessionId: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});

