import { NextRequest, NextResponse } from "next/server";
import { BookingOutcomeSchema } from "@/lib/zod-schemas";
import { getSessionUser } from "@/server/auth";
import { BookingRuleError } from "@/server/services/bookings";
import { recordBookingOutcome } from "@/server/services/checkin";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getSessionUser();
  if (session && session.role === "DONOR") {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Hanya petugas UTD yang dapat mencatat hasil donor.",
        },
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = BookingOutcomeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            parsed.error.issues[0]?.message ||
            "Status hasil donor tidak valid.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const actorId = session?.userId || "usr_coord_01";
    const result = await recordBookingOutcome({
      bookingId: id,
      outcome: parsed.data.outcome,
      note: parsed.data.note,
      actorId,
    });
    return NextResponse.json(result);
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
          code: "OUTCOME_FAILED",
          message: "Gagal menyimpan hasil donor.",
        },
      },
      { status: 400 }
    );
  }
}

