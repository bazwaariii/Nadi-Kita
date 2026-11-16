import {
  formatDateWIB,
  formatShortDateWIB,
  formatTimeWIB,
} from "@/lib/format-tanggal";
import { generateBookingCode, signQrPayload } from "@/lib/qr";
import { hashInvitationToken } from "@/lib/tokens";
import { db, parseBranchRules } from "@/server/db";
import { env } from "@/server/env";
import {
  evaluateCancellationAllowed,
  evaluateSlotBookability,
} from "@/server/rules/slots";

export class BookingRuleError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class SlotUnavailableError extends BookingRuleError {
  constructor(slotTimeText: string) {
    super(
      "SLOT_UNAVAILABLE",
      `Jam ${slotTimeText} baru saja penuh. Pilih jam lain di bawah.`,
      409
    );
  }
}

export class ActiveBookingExistsError extends BookingRuleError {
  constructor(dateText: string, timeText: string) {
    super(
      "ACTIVE_BOOKING_EXISTS",
      `Anda sudah punya jadwal pada ${dateText}, ${timeText}. Batalkan dulu bila ingin memilih jam lain.`,
      409
    );
  }
}

// Antrean mutex dalam proses untuk menjamin eksekusi transaksi konkurensi deterministik
let bookingMutexPromise: Promise<unknown> = Promise.resolve();

function withBookingLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = bookingMutexPromise.then(fn, fn);
  bookingMutexPromise = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

/**
 * Bagian 8.3 & BR-09: Transaksi booking atomik tanpa overbooking dan maksimal 1 booking aktif per donor.
 */
export async function createAtomicBooking(params: {
  slotId: string;
  donorId?: string;
  invitationToken?: string;
  now?: Date;
}) {
  return withBookingLock(async () => {
    const now = params.now || new Date();

    let resolvedDonorId = params.donorId;
    let resolvedInvitationId: string | undefined;

    if (params.invitationToken) {
      const tokenHash = hashInvitationToken(params.invitationToken);
      const inv = await db.invitation.findUnique({
        where: { tokenHash },
      });
      if (!inv) {
        throw new BookingRuleError(
          "INVITATION_NOT_FOUND",
          "Tautan undangan ini sudah tidak berlaku. Hubungi UTD untuk mendapat undangan baru.",
          404
        );
      }
      if (inv.expiresAt.getTime() < now.getTime() || inv.status === "EXPIRED") {
        throw new BookingRuleError(
          "INVITATION_EXPIRED",
          "Tautan undangan ini sudah tidak berlaku. Hubungi UTD untuk mendapat undangan baru.",
          410
        );
      }
      resolvedDonorId = inv.donorId;
      resolvedInvitationId = inv.id;
    }

    if (!resolvedDonorId) {
      throw new BookingRuleError(
        "DONOR_REQUIRED",
        "Identitas donor belum ditemukan. Silakan masuk terlebih dahulu.",
        401
      );
    }

    const slot = await db.slot.findUnique({
      where: { id: params.slotId },
      include: { branch: true },
    });

    if (!slot) {
      throw new BookingRuleError(
        "SLOT_NOT_FOUND",
        "Jadwal yang dipilih tidak ditemukan.",
        404
      );
    }

    const config = parseBranchRules(slot.branch.rules);

    // Periksa apakah donor sudah punya booking aktif (BR-09, AC-04)
    const existingActive = await db.booking.findFirst({
      where: {
        donorId: resolvedDonorId,
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
      },
      include: { slot: true },
    });

    if (existingActive) {
      throw new ActiveBookingExistsError(
        formatShortDateWIB(existingActive.slot.startsAt),
        formatTimeWIB(existingActive.slot.startsAt)
      );
    }

    // Periksa batas waktu minimal sebelum slot dimulai
    const minStartsAt = new Date(
      now.getTime() + config.bookBeforeMin * 60 * 1000
    );
    if (slot.startsAt.getTime() <= minStartsAt.getTime()) {
      const check = evaluateSlotBookability(slot, now, config);
      throw new BookingRuleError(
        check.reasonCode || "TOO_LATE",
        check.message || "Pemesanan untuk jam ini sudah ditutup.",
        409
      );
    }

    const slotTimeText = formatTimeWIB(slot.startsAt);

    // Hasilkan kode unik 8 karakter Crockford base32
    let code = generateBookingCode();
    for (let retry = 0; retry < 5; retry++) {
      const exists = await db.booking.findUnique({ where: { code } });
      if (!exists) break;
      code = generateBookingCode(`${resolvedDonorId}-${Date.now()}-${retry}`);
    }

    const booking = await db.$transaction(async (tx) => {
      // Update kapasitas secara atomik di tingkat basis data (Section 8.3)
      const updatedRows = await tx.$executeRaw`
        UPDATE "Slot"
        SET "bookedCount" = "bookedCount" + 1
        WHERE "id" = ${slot.id}
          AND "bookedCount" < "capacity"
      `;

      if (Number(updatedRows) === 0) {
        throw new SlotUnavailableError(slotTimeText);
      }

      const created = await tx.booking.create({
        data: {
          slotId: slot.id,
          donorId: resolvedDonorId!,
          invitationId: resolvedInvitationId || null,
          code,
          status: "CONFIRMED",
        },
        include: {
          slot: { include: { branch: true } },
          donor: true,
        },
      });

      if (resolvedInvitationId) {
        await tx.invitation.update({
          where: { id: resolvedInvitationId },
          data: { status: "BOOKED" },
        });
      }

      await tx.eventLog.create({
        data: {
          name: "booking_confirmed",
          actorId: resolvedDonorId,
          role: "DONOR",
          entityId: created.id,
          meta: {
            slotId: slot.id,
            invitationId: resolvedInvitationId || null,
            code: created.code,
          },
        },
      });

      return created;
    });

    const expUnix =
      Math.floor(booking.slot.endsAt.getTime() / 1000) + 6 * 3600;
    const qrPayload = signQrPayload(booking.id, expUnix, env.QR_HMAC_SECRET);

    return {
      booking,
      qrPayload,
      displayCode: `NK-${booking.code}`,
      formattedDate: formatDateWIB(booking.slot.startsAt),
      formattedTime: formatTimeWIB(booking.slot.startsAt, true),
    };
  });
}

/**
 * BR-10: Membatalkan jadwal dan mengembalikan kapasitas slot
 */
export async function cancelBookingById(params: {
  bookingId: string;
  actorId?: string;
  now?: Date;
}) {
  return withBookingLock(async () => {
    const now = params.now || new Date();
    const booking = await db.booking.findUnique({
      where: { id: params.bookingId },
      include: {
        slot: { include: { branch: true } },
      },
    });

    if (!booking) {
      throw new BookingRuleError(
        "BOOKING_NOT_FOUND",
        "Jadwal tidak ditemukan.",
        404
      );
    }

    if (booking.status === "CANCELLED") {
      return booking;
    }

    if (booking.status !== "CONFIRMED") {
      throw new BookingRuleError(
        "CANNOT_CANCEL_STATUS",
        "Jadwal yang sudah check-in atau selesai tidak dapat dibatalkan.",
        400
      );
    }

    const config = parseBranchRules(booking.slot.branch.rules);
    const check = evaluateCancellationAllowed(
      booking.slot.startsAt,
      now,
      config
    );
    if (!check.allowed) {
      throw new BookingRuleError(
        "CANCELLATION_WINDOW_PASSED",
        check.message || "Batas waktu pembatalan sudah lewat.",
        400
      );
    }

    const updated = await db.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "Slot"
        SET "bookedCount" = CASE WHEN "bookedCount" > 0 THEN "bookedCount" - 1 ELSE 0 END
        WHERE "id" = ${booking.slotId}
      `;

      const cancelled = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          invitationId: null,
        },
        include: {
          slot: { include: { branch: true } },
          donor: true,
        },
      });

      if (booking.invitationId) {
        await tx.invitation.update({
          where: { id: booking.invitationId },
          data: { status: "SCREENED_OK" },
        });
      }

      await tx.eventLog.create({
        data: {
          name: "booking_cancelled",
          actorId: params.actorId || booking.donorId,
          role: "DONOR",
          entityId: booking.id,
          meta: {
            slotId: booking.slotId,
          },
        },
      });

      return cancelled;
    });

    return updated;
  });
}

