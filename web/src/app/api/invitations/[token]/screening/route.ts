import { NextRequest, NextResponse } from "next/server";
import { hashInvitationToken } from "@/lib/tokens";
import { ScreeningSubmitSchema } from "@/lib/zod-schemas";
import { db, parseBranchRules } from "@/server/db";
import { evaluateScreening } from "@/server/rules/eligibility";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const tokenHash = hashInvitationToken(token);

  const invitation = await db.invitation.findUnique({
    where: { tokenHash },
    include: {
      campaign: { include: { branch: true } },
      donor: true,
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

  const body = await req.json().catch(() => null);
  const parsed = ScreeningSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            parsed.error.issues[0]?.message ||
            "Periksa kembali jawaban pemeriksaan awal Anda.",
        },
      },
      { status: 400 }
    );
  }

  const config = parseBranchRules(invitation.campaign.branch.rules);
  const lastDonationInput =
    parsed.data.lastDonationConfirmedAt !== undefined
      ? parsed.data.lastDonationConfirmedAt
      : invitation.donor.lastDonationAt;

  // BR-08: evaluateScreening murni deterministik tanpa ML
  const evaluation = evaluateScreening(
    {
      weightKg: parsed.data.weightKg,
      sleepHours: parsed.data.sleepHours,
      hbStatus: parsed.data.hbStatus,
      lastDonationConfirmedAt: lastDonationInput,
    },
    config,
    now
  );

  const confirmedLastDate = lastDonationInput
    ? new Date(lastDonationInput)
    : null;

  const screeningRecord = await db.screening.upsert({
    where: { invitationId: invitation.id },
    update: {
      weightKg: parsed.data.weightKg,
      sleepHours: parsed.data.sleepHours,
      hbStatus: parsed.data.hbStatus,
      lastDonationConfirmedAt:
        confirmedLastDate && !Number.isNaN(confirmedLastDate.getTime())
          ? confirmedLastDate
          : null,
      eligible: evaluation.eligible,
      reasons: evaluation.reasons,
      rulesVersion: evaluation.rulesVersion,
    },
    create: {
      invitationId: invitation.id,
      weightKg: parsed.data.weightKg,
      sleepHours: parsed.data.sleepHours,
      hbStatus: parsed.data.hbStatus,
      lastDonationConfirmedAt:
        confirmedLastDate && !Number.isNaN(confirmedLastDate.getTime())
          ? confirmedLastDate
          : null,
      eligible: evaluation.eligible,
      reasons: evaluation.reasons,
      rulesVersion: evaluation.rulesVersion,
    },
  });

  await db.invitation.update({
    where: { id: invitation.id },
    data: {
      status: evaluation.eligible ? "SCREENED_OK" : "SCREENED_NOT_ELIGIBLE",
    },
  });

  return NextResponse.json({
    screening: screeningRecord,
    evaluation,
  });
}

