import { NextRequest, NextResponse } from "next/server";
import { generateTicketIcs } from "@/lib/ics";
import { db } from "@/server/db";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      donor: true,
      slot: { include: { branch: true } },
    },
  });

  if (!booking) {
    return NextResponse.json(
      {
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Tiket donor tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  const icsContent = generateTicketIcs({
    bookingCode: booking.code,
    donorName: booking.donor.fullName,
    branchName: booking.slot.branch.name,
    startsAt: booking.slot.startsAt,
    endsAt: booking.slot.endsAt,
  });

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="tiket-donor-NK-${booking.code}.ics"`,
    },
  });
}

