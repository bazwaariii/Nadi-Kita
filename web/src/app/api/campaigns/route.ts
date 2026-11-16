import { NextRequest, NextResponse } from "next/server";
import { BloodGroupCode } from "@/lib/format-tanggal";
import { CreateCampaignSchema } from "@/lib/zod-schemas";
import { getSessionUser } from "@/server/auth";
import { db } from "@/server/db";
import { createCampaignDraftOrSend } from "@/server/services/campaigns";

export async function GET() {
  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      invitations: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  return NextResponse.json({ campaigns });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (session && session.role === "DONOR") {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Hanya koordinator UTD yang dapat membuat permintaan donor.",
        },
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateCampaignSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            parsed.error.issues[0]?.message ||
            "Periksa kembali isian permintaan donor.",
        },
      },
      { status: 400 }
    );
  }

  const sendImmediately = Boolean(body?.sendImmediately);
  const actorId = session?.userId || "usr_coord_01";

  const result = await createCampaignDraftOrSend({
    group: parsed.data.group as BloodGroupCode,
    targetUnits: parsed.data.targetUnits,
    deadlineAt: new Date(parsed.data.deadlineAt),
    cohortFilter: parsed.data.cohortFilter || null,
    customInviteCount: parsed.data.customInviteCount || null,
    createdById: actorId,
    sendImmediately,
  });

  return NextResponse.json(result, { status: 201 });
}

