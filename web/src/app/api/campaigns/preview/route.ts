import { NextRequest, NextResponse } from "next/server";
import { BloodGroupCode } from "@/lib/format-tanggal";
import { CampaignPreviewSchema } from "@/lib/zod-schemas";
import { generateCampaignPreview } from "@/server/services/campaigns";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CampaignPreviewSchema.safeParse(body);

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

  const deadlineDate = new Date(parsed.data.deadlineAt);
  if (Number.isNaN(deadlineDate.getTime())) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_DATE",
          message: "Format tanggal batas waktu tidak valid.",
        },
      },
      { status: 400 }
    );
  }

  const preview = await generateCampaignPreview({
    group: parsed.data.group as BloodGroupCode,
    targetUnits: parsed.data.targetUnits,
    deadlineAt: deadlineDate,
    cohortFilter: parsed.data.cohortFilter || null,
    customInviteCount: parsed.data.customInviteCount || null,
  });

  return NextResponse.json(preview);
}

