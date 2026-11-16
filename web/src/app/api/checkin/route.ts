import { NextRequest, NextResponse } from "next/server";
import { CheckInSchema } from "@/lib/zod-schemas";
import { getSessionUser } from "@/server/auth";
import { BookingRuleError } from "@/server/services/bookings";
import { checkInBooking } from "@/server/services/checkin";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (session && session.role === "DONOR") {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Hanya petugas UTD yang dapat memindai tiket.",
        },
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = CheckInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Masukkan kode tiket atau pindai QR.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const actorId = session?.userId || "usr_coord_01";
    const result = await checkInBooking({
      qrPayload: parsed.data.qrPayload,
      code: parsed.data.code,
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
          code: "CHECKIN_FAILED",
          message: "Gagal memverifikasi tiket donor.",
        },
      },
      { status: 400 }
    );
  }
}

