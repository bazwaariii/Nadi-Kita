import { NextRequest, NextResponse } from "next/server";
import { hashInvitationToken } from "@/lib/tokens";
import { db } from "@/server/db";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const tokenHash = hashInvitationToken(token);

  const invitation = await db.invitation.findUnique({
    where: { tokenHash },
  });

  if (!invitation) {
    return NextResponse.json(
      {
        error: {
          code: "INVITATION_NOT_FOUND",
          message:
            "Tautan undangan ini sudah tidak berlaku. Hubungi UTD untuk mendapat undangan baru.",
        },
      },
      { status: 404 }
    );
  }

  const updated = await db.invitation.update({
    where: { id: invitation.id },
    data: { status: "DECLINED" },
  });

  return NextResponse.json({ invitation: updated });
}

