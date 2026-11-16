import { BloodGroup, Sex } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  hashPassword,
  SESSION_COOKIE_NAME,
} from "@/server/auth";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { calculateAgeYears } from "@/server/rules/eligibility";

const MAX_KTP_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const fullName = String(body?.fullName || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const phone = String(body?.phone || "").trim();
  const password = String(body?.password || "");
  const birthDateStr = String(body?.birthDate || "");
  const sex = body?.sex === "F" ? "F" : "M";
  const bloodGroup = String(body?.bloodGroup || "B_POS") as BloodGroup;
  const cityArea = String(body?.cityArea || "Surabaya").trim();
  const contactConsent = Boolean(body?.contactConsent);

  const ktpFileName = String(body?.ktpFileName || "").trim();
  const ktpFileSize = Number(body?.ktpFileSize || 0);
  const ktpFileData = String(body?.ktpFileData || "").trim();

  if (!fullName || !email || !password || !birthDateStr) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Lengkapi nama, email, kata sandi, dan tanggal lahir Anda.",
        },
      },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      {
        error: {
          code: "PASSWORD_TOO_SHORT",
          message: "Kata sandi minimal terdiri dari 6 karakter.",
        },
      },
      { status: 400 }
    );
  }

  const parsedBirthDate = new Date(birthDateStr);
  if (Number.isNaN(parsedBirthDate.getTime())) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BIRTH_DATE",
          message: "Tanggal lahir tidak valid.",
        },
      },
      { status: 400 }
    );
  }

  const now = new Date();
  const ageYears = calculateAgeYears(parsedBirthDate, now);
  if (ageYears < 17 || ageYears > 60) {
    return NextResponse.json(
      {
        error: {
          code: "AGE_OUT_OF_RANGE",
          message: `Syarat usia pendonor adalah 17 sampai 60 tahun (usia terhitung: ${ageYears} tahun).`,
        },
      },
      { status: 400 }
    );
  }

  // Wajib unggah dokumen PDF KTP saat pendaftaran
  if (!ktpFileName || !ktpFileData) {
    return NextResponse.json(
      {
        error: {
          code: "KTP_PDF_REQUIRED",
          message:
            "Unggah dokumen KTP Anda dalam format PDF terlebih dahulu untuk verifikasi identitas.",
        },
      },
      { status: 400 }
    );
  }

  if (
    !ktpFileName.toLowerCase().endsWith(".pdf") ||
    !ktpFileData.startsWith("data:application/pdf;base64,")
  ) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_KTP_FORMAT",
          message:
            "Dokumen KTP harus berformat PDF (.pdf). Silakan pilih file PDF yang valid.",
        },
      },
      { status: 400 }
    );
  }

  if (ktpFileSize > MAX_KTP_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: {
          code: "KTP_TOO_LARGE",
          message: "Ukuran file PDF KTP maksimal 5 MB.",
        },
      },
      { status: 400 }
    );
  }

  if (!contactConsent) {
    return NextResponse.json(
      {
        error: {
          code: "CONSENT_REQUIRED",
          message:
            "Centang persetujuan dihubungi oleh UTD untuk melanjutkan pendaftaran.",
        },
      },
      { status: 400 }
    );
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      {
        error: {
          code: "EMAIL_TAKEN",
          message: "Email ini sudah terdaftar. Silakan masuk ke akun Anda.",
        },
      },
      { status: 409 }
    );
  }

  const created = await db.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email,
        name: fullName,
        passwordHash: hashPassword(password),
        role: "DONOR",
        branchId: env.DEFAULT_BRANCH_ID,
      },
    });

    const d = await tx.donorProfile.create({
      data: {
        userId: u.id,
        fullName,
        email,
        phone: phone || "0899-0000-9999",
        birthDate: parsedBirthDate,
        sex: sex as Sex,
        bloodGroup,
        cohort: cityArea || "Surabaya",
        contactConsent: true,
        consentAt: now,
        donationCount: 0,
        ktpFileName,
        ktpFileSize,
        ktpFileData,
        ktpVerified: false,
        ktpUploadedAt: now,
        isSynthetic: false,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: u.id,
        action: "DONOR_REGISTERED_WITH_KTP",
        entity: "DonorProfile",
        entityId: d.id,
        after: {
          fullName: d.fullName,
          bloodGroup: d.bloodGroup,
          ktpFileName: d.ktpFileName,
          ktpFileSize: d.ktpFileSize,
        },
      },
    });

    return { user: u, donor: d };
  });

  const token = createSessionToken({
    userId: created.user.id,
    email: created.user.email,
    name: created.user.name,
    role: "DONOR",
    donorId: created.donor.id,
  });

  const res = NextResponse.json(
    {
      user: created.user,
      donor: created.donor,
      redirectTo: "/donor",
    },
    { status: 201 }
  );

  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });

  return res;
}
