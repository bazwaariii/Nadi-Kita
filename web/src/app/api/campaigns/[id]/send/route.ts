import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { sendCampaignInvitations } from "@/server/services/campaigns";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getSessionUser();
  if (session && session.role === "DONOR") {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Hanya koordinator UTD yang dapat mengirim undangan.",
        },
      },
      { status: 403 }
    );
  }

  try {
    const actorId = session?.userId || "usr_coord_01";
    const res = await sendCampaignInvitations(id, actorId);
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "CAMPAIGN_SEND_FAILED",
          message:
            err instanceof Error
              ? err.message
              : "Gagal mengirim undangan permintaan donor.",
        },
      },
      { status: 400 }
    );
  }
}

