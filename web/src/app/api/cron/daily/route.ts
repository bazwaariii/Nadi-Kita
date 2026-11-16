import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { env } from "@/server/env";

/**
 * Bagian 11.2: Cron harian untuk merapikan NO_SHOW dan EXPIRED serta mengirim pengingat H-1
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronKey = req.headers.get("x-cron-secret");

  if (
    authHeader !== `Bearer ${env.CRON_SECRET}` &&
    cronKey !== env.CRON_SECRET &&
    process.env.NODE_ENV === "production"
  ) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED_CRON",
          message: "Kunci cron tidak sah.",
        },
      },
      { status: 401 }
    );
  }

  const now = new Date();
  const graceCutoff = new Date(now.getTime() - 30 * 60 * 1000);

  // 1. Tandai undangan kedaluwarsa (EXPIRED)
  const expiredInvitations = await db.invitation.updateMany({
    where: {
      status: { in: ["QUEUED", "SENT", "OPENED", "SCREENED_OK"] },
      expiresAt: { lt: now },
    },
    data: {
      status: "EXPIRED",
    },
  });

  // 2. Tandai booking yang lewat tanpa check-in sebagai NO_SHOW (Section 5.3)
  const pastSlots = await db.slot.findMany({
    where: {
      endsAt: { lt: graceCutoff },
    },
    select: { id: true },
  });
  const pastSlotIds = pastSlots.map((s) => s.id);

  const noShowBookings =
    pastSlotIds.length > 0
      ? await db.booking.updateMany({
          where: {
            slotId: { in: pastSlotIds },
            status: "CONFIRMED",
          },
          data: {
            status: "NO_SHOW",
          },
        })
      : { count: 0 };

  // 3. Hitung kandidat pengingat H-1
  const tomorrowStart = new Date(now.getTime() + 20 * 3600 * 1000);
  const tomorrowEnd = new Date(now.getTime() + 32 * 3600 * 1000);
  const upcomingBookings = await db.booking.count({
    where: {
      status: "CONFIRMED",
      slot: {
        startsAt: {
          gte: tomorrowStart,
          lte: tomorrowEnd,
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    at: now.toISOString(),
    expiredInvitationsCount: expiredInvitations.count,
    noShowBookingsCount: noShowBookings.count,
    remindersQueuedCount: upcomingBookings,
  });
}

