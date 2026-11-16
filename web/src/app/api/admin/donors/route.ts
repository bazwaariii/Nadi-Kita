import { NextRequest, NextResponse } from "next/server";
import { BloodGroup, Sex } from "@prisma/client";
import { getSessionUser, hashPassword } from "@/server/auth";
import { db, parseBranchRules } from "@/server/db";
import { env } from "@/server/env";

const VALID_GROUPS = new Set<string>([
  "A_POS",
  "A_NEG",
  "B_POS",
  "B_NEG",
  "AB_POS",
  "AB_NEG",
  "O_POS",
  "O_NEG",
]);

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "Data pendonor tidak valid." } },
      { status: 400 }
    );
  }

  // Tindakan 1: Catat donor selesai langsung (walk-in donation)
  if (body.action === "RECORD_DONATION" && body.donorId) {
    const donor = await db.donorProfile.findUnique({
      where: { id: String(body.donorId) },
    });
    if (!donor) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Pendonor tidak ditemukan." } },
        { status: 404 }
      );
    }

    const now = new Date();
    if (donor.nextEligibleAt && donor.nextEligibleAt.getTime() > now.getTime()) {
      return NextResponse.json(
        {
          error: {
            code: "DONOR_IN_COOLDOWN",
            message:
              "Pendonor masih berada dalam masa jeda pemulihan 60 hari.",
          },
        },
        { status: 409 }
      );
    }

    const branch = await db.branch.findUnique({
      where: { id: env.DEFAULT_BRANCH_ID },
    });
    const config = parseBranchRules(branch?.rules);
    const nextEligibleAt = new Date(
      now.getTime() + config.cooldownDays * 24 * 60 * 60 * 1000
    );
    const volumeMl = Number(body.volumeMl) || 350;

    const result = await db.$transaction(async (tx) => {
      const donation = await tx.donation.create({
        data: {
          donorId: donor.id,
          branchId: env.DEFAULT_BRANCH_ID,
          donatedAt: now,
          volumeMl,
          source: "WALK_IN_UTD",
        },
      });

      const updatedDonor = await tx.donorProfile.update({
        where: { id: donor.id },
        data: {
          lastDonationAt: now,
          firstDonationAt: donor.firstDonationAt || now,
          donationCount: { increment: 1 },
          nextEligibleAt,
        },
      });

      await tx.stockLevel.updateMany({
        where: {
          branchId: env.DEFAULT_BRANCH_ID,
          group: donor.bloodGroup,
        },
        data: {
          units: { increment: 1 },
          updatedBy: session?.userId || "coordinator",
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: session?.userId || "coordinator",
          action: "WALK_IN_DONATION_COMPLETED",
          entity: "DonorProfile",
          entityId: donor.id,
          after: {
            bloodGroup: donor.bloodGroup,
            volumeMl,
            nextEligibleAt: nextEligibleAt.toISOString(),
          },
        },
      });

      return { donation, updatedDonor };
    });

    return NextResponse.json({
      ok: true,
      donor: result.updatedDonor,
      nextEligibleAt: nextEligibleAt.toISOString(),
    });
  }

  // Tindakan 2: Tambah pendonor baru oleh Admin UTD
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const phone = String(body.phone || "").trim();
  const bloodGroup = String(body.bloodGroup || "O_POS");
  const sex = body.sex === "F" ? Sex.F : Sex.M;
  const birthDateRaw = String(body.birthDate || "1998-05-10");
  const cohort = String(body.cityArea || "Surabaya").trim();
  const ktpFileName = body.ktpFileName ? String(body.ktpFileName) : null;
  const ktpFileSize = body.ktpFileSize ? Number(body.ktpFileSize) : null;
  const ktpFileData = body.ktpFileData ? String(body.ktpFileData) : null;
  const ktpVerified = Boolean(body.ktpVerified);

  if (fullName.length < 2) {
    return NextResponse.json(
      {
        error: {
          code: "NAME_REQUIRED",
          message: "Nama lengkap pendonor wajib diisi.",
        },
      },
      { status: 400 }
    );
  }

  if (!VALID_GROUPS.has(bloodGroup)) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_GROUP",
          message: "Golongan darah tidak valid.",
        },
      },
      { status: 400 }
    );
  }

  const birthDate = new Date(birthDateRaw);
  const now = new Date();

  const created = await db.$transaction(async (tx) => {
    let userId: string | null = null;
    if (email && email.includes("@")) {
      const existingUser = await tx.user.findUnique({ where: { email } });
      if (!existingUser) {
        const u = await tx.user.create({
          data: {
            email,
            name: fullName,
            passwordHash: hashPassword("nadikita2026"),
            role: "DONOR",
          },
        });
        userId = u.id;
      }
    }

    const donor = await tx.donorProfile.create({
      data: {
        userId,
        fullName,
        email: email || null,
        phone: phone || null,
        birthDate,
        sex,
        bloodGroup: bloodGroup as BloodGroup,
        cohort,
        contactConsent: true,
        consentAt: now,
        ktpFileName,
        ktpFileSize,
        ktpFileData,
        ktpVerified,
        ktpUploadedAt: ktpFileData ? now : null,
        isSynthetic: false,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: session?.userId || "coordinator",
        action: "ADMIN_CREATE_DONOR",
        entity: "DonorProfile",
        entityId: donor.id,
        after: {
          fullName: donor.fullName,
          bloodGroup: donor.bloodGroup,
          ktpVerified: donor.ktpVerified,
        },
      },
    });

    return donor;
  });

  return NextResponse.json({ donor: created }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionUser();
  const { searchParams } = new URL(req.url);
  const donorId = searchParams.get("id");

  if (!donorId) {
    return NextResponse.json(
      { error: { code: "ID_REQUIRED", message: "ID pendonor diperlukan." } },
      { status: 400 }
    );
  }

  const existing = await db.donorProfile.findUnique({ where: { id: donorId } });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Pendonor tidak ditemukan." } },
      { status: 404 }
    );
  }

  await db.$transaction(async (tx) => {
    await tx.booking.deleteMany({ where: { donorId } });
    await tx.invitation.deleteMany({ where: { donorId } });
    await tx.donation.deleteMany({ where: { donorId } });
    await tx.donorProfile.delete({ where: { id: donorId } });
    await tx.auditLog.create({
      data: {
        actorId: session?.userId || "coordinator",
        action: "ADMIN_DELETE_DONOR",
        entity: "DonorProfile",
        entityId: donorId,
        before: { fullName: existing.fullName, bloodGroup: existing.bloodGroup },
      },
    });
  });

  return NextResponse.json({ ok: true });
}

