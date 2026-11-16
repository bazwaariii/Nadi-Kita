import { NextRequest, NextResponse } from "next/server";
import { BloodGroupCode } from "@/lib/format-tanggal";
import { deriveInvitationToken } from "@/lib/tokens";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { buildInvitationLinks } from "@/server/services/email";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const campaign = await db.campaign.findUnique({
    where: { id },
    include: {
      branch: true,
      invitations: {
        include: {
          donor: true,
          screening: true,
          booking: {
            include: { slot: true },
          },
        },
        orderBy: { rank: "asc" },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json(
      {
        error: {
          code: "CAMPAIGN_NOT_FOUND",
          message: "Permintaan donor tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  const invitations = campaign.invitations.map((inv) => {
    const { rawToken } = deriveInvitationToken(inv.id, env.AUTH_SECRET);
    const links = buildInvitationLinks({
      rawToken,
      donorName: inv.donor.fullName,
      donorPhone: inv.donor.phone,
      bloodGroup: campaign.group as BloodGroupCode,
      branchName: campaign.branch.name,
      deadlineAt: campaign.deadlineAt,
    });
    return {
      ...inv,
      rawToken,
      links,
    };
  });

  return NextResponse.json({
    campaign: {
      ...campaign,
      invitations,
    },
  });
}

