import { NextRequest, NextResponse } from "next/server";
import {
  formatDateWIB,
  formatDayDateWIB,
  formatTimeWIB,
} from "@/lib/format-tanggal";
import { getSessionUser } from "@/server/auth";
import { db } from "@/server/db";
import { env } from "@/server/env";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const now = new Date();
  const fromDate = fromParam
    ? new Date(fromParam)
    : new Date(now.getTime() - 2 * 3600 * 1000);
  const toDate = toParam
    ? new Date(toParam)
    : new Date(now.getTime() + 8 * 24 * 3600 * 1000);

  const slots = await db.slot.findMany({
    where: {
      branchId: env.DEFAULT_BRANCH_ID,
      startsAt: {
        gte: fromDate,
        lte: toDate,
      },
    },
    orderBy: { startsAt: "asc" },
  });

  const enriched = slots.map((s) => {
    const remaining = Math.max(0, s.capacity - s.bookedCount);
    return {
      id: s.id,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      dayKey: formatDateWIB(s.startsAt),
      dayLabel: formatDayDateWIB(s.startsAt),
      timeLabel: formatTimeWIB(s.startsAt),
      capacity: s.capacity,
      bookedCount: s.bookedCount,
      remaining,
      isFull: remaining === 0,
    };
  });

  return NextResponse.json({ slots: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (session && session.role === "DONOR") {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Hanya koordinator yang dapat mengelola kapasitas slot.",
        },
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BODY",
          message: "Data slot tidak valid.",
        },
      },
      { status: 400 }
    );
  }

  if (body.slotId && typeof body.capacity === "number") {
    const existing = await db.slot.findUnique({ where: { id: body.slotId } });
    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Slot tidak ditemukan." } },
        { status: 404 }
      );
    }
    const newCap = Math.max(existing.bookedCount, Math.min(20, body.capacity));
    const updated = await db.slot.update({
      where: { id: existing.id },
      data: { capacity: newCap },
    });
    return NextResponse.json({ slot: updated });
  }

  if (body.startsAt && typeof body.capacity === "number") {
    const start = new Date(body.startsAt);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const created = await db.slot.upsert({
      where: {
        branchId_startsAt: {
          branchId: env.DEFAULT_BRANCH_ID,
          startsAt: start,
        },
      },
      update: { capacity: body.capacity },
      create: {
        branchId: env.DEFAULT_BRANCH_ID,
        startsAt: start,
        endsAt: end,
        capacity: body.capacity,
        bookedCount: 0,
      },
    });
    return NextResponse.json({ slot: created }, { status: 201 });
  }

  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Masukkan slotId atau waktu mulai beserta kapasitas.",
      },
    },
    { status: 400 }
  );
}

