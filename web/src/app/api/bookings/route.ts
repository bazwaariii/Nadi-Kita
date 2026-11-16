import { NextRequest, NextResponse } from "next/server";
import { CreateBookingSchema } from "@/lib/zod-schemas";
import { getSessionUser } from "@/server/auth";
import { db } from "@/server/db";
import {
  BookingRuleError,
  createAtomicBooking,
} from "@/server/services/bookings";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CreateBookingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            parsed.error.issues[0]?.message ||
            "Pilih jam jadwal terlebih dahulu.",
        },
      },
      { status: 400 }
    );
  }

  const session = await getSessionUser();
  const donorId = parsed.data.donorId || session?.donorId || undefined;

  if (!parsed.data.token && donorId) {
    const donor = await db.donorProfile.findUnique({ where: { id: donorId } });
    if (
      donor?.nextEligibleAt &&
      donor.nextEligibleAt.getTime() > Date.now()
    ) {
      return NextResponse.json(
        {
          error: {
            code: "DONOR_IN_COOLDOWN",
            message:
              "Anda masih berada dalam masa jeda pemulihan 60 hari pascadonor.",
          },
        },
        { status: 409 }
      );
    }
  }

  try {
    const result = await createAtomicBooking({
      slotId: parsed.data.slotId,
      invitationToken: parsed.data.token,
      donorId,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof BookingRuleError) {
      return NextResponse.json(
        {
          error: {
            code: err.code,
            message: err.message,
          },
        },
        { status: err.status }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "BOOKING_ERROR",
          message:
            err instanceof Error
              ? err.message
              : "Gagal menyimpan jadwal donor.",
        },
      },
      { status: 500 }
    );
  }
}

