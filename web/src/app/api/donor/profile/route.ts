import { BloodGroup } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { BloodGroupEnum } from "@/lib/zod-schemas";
import { getDefaultDemoDonor, getSessionUser } from "@/server/auth";
import { db, parseBranchRules } from "@/server/db";
import { env } from "@/server/env";

export async function PATCH(req: NextRequest) {
  const session = await getSessionUser();
  const body = await req.json().catch(() => null);

  let donorId = body?.donorId || session?.donorId;
  if (!donorId) {
    const demo = await getDefaultDemoDonor();
    donorId = demo?.id;
  }

  if (!donorId) {
    return NextResponse.json(
      {
        error: {
          code: "DONOR_NOT_FOUND",
          message: "Profil donor tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  const existing = await db.donorProfile.findUnique({
    where: { id: donorId },
  });

  if (!existing) {
    return NextResponse.json(
      {
        error: {
          code: "DONOR_NOT_FOUND",
          message: "Profil donor tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  const branch = await db.branch.findUnique({
    where: { id: env.DEFAULT_BRANCH_ID },
  });
  const config = parseBranchRules(branch?.rules);

  const parsedGroup = body?.bloodGroup
    ? BloodGroupEnum.safeParse(body.bloodGroup)
    : null;
  const newBloodGroup = parsedGroup?.success
    ? (parsedGroup.data as BloodGroup)
    : existing.bloodGroup;

  const newFullName = body?.fullName
    ? String(body.fullName).trim()
    : existing.fullName;
  const newPhone = body?.phone ? String(body.phone).trim() : existing.phone;
  const newCohort = body?.cityArea
    ? String(body.cityArea).trim()
    : existing.cohort;
  const newBirthDate = body?.birthDate
    ? new Date(body.birthDate)
    : existing.birthDate;
  const newContactConsent =
    typeof body?.contactConsent === "boolean"
      ? body.contactConsent
      : existing.contactConsent;

  let newLastDonationAt = existing.lastDonationAt;
  let newNextEligibleAt = existing.nextEligibleAt;

  if (body?.lastDonationAt !== undefined) {
    if (body.lastDonationAt === null || body.lastDonationAt === "") {
      newLastDonationAt = null;
      newNextEligibleAt = null;
    } else {
      const parsedLast = new Date(body.lastDonationAt);
      if (!Number.isNaN(parsedLast.getTime())) {
        newLastDonationAt = parsedLast;
        newNextEligibleAt = new Date(
          parsedLast.getTime() + config.cooldownDays * 24 * 60 * 60 * 1000
        );
      }
    }
  }

  // Dukungan pembaruan dokumen PDF KTP
  let ktpFileName = existing.ktpFileName;
  let ktpFileSize = existing.ktpFileSize;
  let ktpFileData = existing.ktpFileData;
  let ktpUploadedAt = existing.ktpUploadedAt;
  let ktpVerified = existing.ktpVerified;

  if (body?.ktpFileData && body?.ktpFileName) {
    const fname = String(body.ktpFileName).trim();
    const fdata = String(body.ktpFileData).trim();
    if (
      !fname.toLowerCase().endsWith(".pdf") ||
      !fdata.startsWith("data:application/pdf;base64,")
    ) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_KTP_FORMAT",
            message: "Dokumen KTP harus berformat PDF (.pdf).",
          },
        },
        { status: 400 }
      );
    }
    ktpFileName = fname;
    ktpFileSize = Number(body.ktpFileSize || 0);
    ktpFileData = fdata;
    ktpUploadedAt = new Date();
    ktpVerified = false;
  }

  const actorId = session?.userId || existing.id;

  const updated = await db.$transaction(async (tx) => {
    if (existing.userId && newFullName !== existing.fullName) {
      await tx.user.update({
        where: { id: existing.userId },
        data: { name: newFullName },
      });
    }

    const d = await tx.donorProfile.update({
      where: { id: existing.id },
      data: {
        fullName: newFullName,
        phone: newPhone,
        cohort: newCohort,
        bloodGroup: newBloodGroup,
        birthDate: newBirthDate,
        contactConsent: newContactConsent,
        consentAt: newContactConsent
          ? existing.consentAt || new Date()
          : null,
        lastDonationAt: newLastDonationAt,
        nextEligibleAt: newNextEligibleAt,
        ktpFileName,
        ktpFileSize,
        ktpFileData,
        ktpUploadedAt,
        ktpVerified,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "DONOR_PROFILE_UPDATED",
        entity: "DonorProfile",
        entityId: existing.id,
        before: {
          bloodGroup: existing.bloodGroup,
          birthDate: existing.birthDate,
          lastDonationAt: existing.lastDonationAt,
          contactConsent: existing.contactConsent,
          ktpFileName: existing.ktpFileName,
        },
        after: {
          bloodGroup: d.bloodGroup,
          birthDate: d.birthDate,
          lastDonationAt: d.lastDonationAt,
          contactConsent: d.contactConsent,
          ktpFileName: d.ktpFileName,
        },
      },
    });

    return d;
  });

  return NextResponse.json({ donor: updated });
}
