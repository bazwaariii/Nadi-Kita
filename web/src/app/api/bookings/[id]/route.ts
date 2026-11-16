import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import {
  BookingRuleError,
  cancelBookingById,
} from "@/server/services/bookings";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getSessionUser();

  try {
    const cancelled = await cancelBookingById({
      bookingId: id,
      actorId: session?.donorId || session?.userId || undefined,
    });
    return NextResponse.json({ booking: cancelled });
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
          code: "CANCEL_FAILED",
          message: "Gagal membatalkan jadwal.",
        },
      },
      { status: 400 }
    );
  }
}

