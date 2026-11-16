import { NextRequest, NextResponse } from "next/server";
import { EventLogSchema } from "@/lib/zod-schemas";
import { getSessionUser } from "@/server/auth";
import { db } from "@/server/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = EventLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data event tidak valid.",
        },
      },
      { status: 400 }
    );
  }

  const session = await getSessionUser();
  const created = await db.eventLog.create({
    data: {
      name: parsed.data.name,
      actorId: session?.userId || null,
      role: session?.role || null,
      entityId: parsed.data.entityId || null,
      sessionId: parsed.data.sessionId || null,
      meta: parsed.data.meta
        ? JSON.parse(JSON.stringify(parsed.data.meta))
        : undefined,
    },
  });

  return NextResponse.json({ event: created }, { status: 201 });
}

