import { NextRequest, NextResponse } from "next/server";
import { signQrPayload } from "@/lib/qr";
import { hashInvitationToken } from "@/lib/tokens";
import { db } from "@/server/db";
import { env } from "@/server/env";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const tokenHash = hashInvitationToken(token);

  const invitation = await db.invitation.findUnique({
    where: { tokenHash },
    include: {
      campaign: {
        include: { branch: true },
      },
      donor: true,
      screening: true,
      booking: {
        include: { slot: { include: { branch: true } } },
      },
    },
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

  const now = new Date();
  if (
    invitation.expiresAt.getTime() < now.getTime() ||
    invitation.status === "EXPIRED"
  ) {
    if (invitation.status !== "EXPIRED" && invitation.status !== "BOOKED") {
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
    }
    return NextResponse.json(
      {
        error: {
          code: "INVITATION_EXPIRED",
          message:
            "Tautan undangan ini sudah tidak berlaku. Hubungi UTD untuk mendapat undangan baru.",
        },
      },
      { status: 410 }
    );
  }

  // Tandai OPENED bila sebelumnya SENT atau QUEUED (planning.md 11.2 & 5.2)
  let updatedStatus: string = invitation.status;
  if (invitation.status === "SENT" || invitation.status === "QUEUED") {
    const updated = await db.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "OPENED",
        openedAt: invitation.openedAt || now,
      },
    });
    updatedStatus = updated.status;

    await db.eventLog.create({
      data: {
        name: "invitation_opened",
        actorId: invitation.donorId,
        role: "DONOR",
        entityId: invitation.id,
      },
    });
  }

  let qrPayload: string | null = null;
  if (invitation.booking) {
    const expUnix =
      Math.floor(invitation.booking.slot.endsAt.getTime() / 1000) + 6 * 3600;
    qrPayload = signQrPayload(
      invitation.booking.id,
      expUnix,
      env.QR_HMAC_SECRET
    );
  }

  // Hanya kembalikan konteks untuk undangan ini tanpa membocorkan data donor lain (BR-07 & Bagian 13)
  return NextResponse.json({
    invitation: {
      id: invitation.id,
      status: updatedStatus,
      expiresAt: invitation.expiresAt.toISOString(),
      campaign: {
        id: invitation.campaign.id,
        group: invitation.campaign.group,
        targetUnits: invitation.campaign.targetUnits,
        deadlineAt: invitation.campaign.deadlineAt.toISOString(),
        branchName: invitation.campaign.branch.name,
      },
      donor: {
        id: invitation.donor.id,
        fullName: invitation.donor.fullName,
        bloodGroup: invitation.donor.bloodGroup,
        lastDonationAt: invitation.donor.lastDonationAt
          ? invitation.donor.lastDonationAt.toISOString()
          : null,
      },
      screening: invitation.screening,
      booking: invitation.booking
        ? {
            ...invitation.booking,
            displayCode: `NK-${invitation.booking.code}`,
            qrPayload,
          }
        : null,
    },
  });
}
