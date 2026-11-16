import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hashPassword } from "@/server/auth";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { DEFAULT_ELIGIBILITY_CONFIG } from "@/server/rules/eligibility";

export async function GET() {
  const branch = await db.branch.findUnique({
    where: { id: env.DEFAULT_BRANCH_ID },
  });

  const admins = await db.user.findMany({
    where: { role: { in: ["COORDINATOR", "ADMIN"] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    branch: {
      id: branch?.id || env.DEFAULT_BRANCH_ID,
      name: branch?.name || "UTD PMI Kota Surabaya",
      city: branch?.city || "Surabaya",
      rules: branch?.rules || DEFAULT_ELIGIBILITY_CONFIG,
    },
    admins,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionUser();
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "Data pengaturan tidak valid." } },
      { status: 400 }
    );
  }

  const existing = await db.branch.findUnique({
    where: { id: env.DEFAULT_BRANCH_ID },
  });

  const prevRules =
    (existing?.rules as Record<string, unknown>) ||
    JSON.parse(JSON.stringify(DEFAULT_ELIGIBILITY_CONFIG));

  const nextRules = {
    ...prevRules,
    cooldownDays: Number(body.cooldownDays ?? prevRules.cooldownDays ?? 60),
    minWeightKg: Number(body.minWeightKg ?? prevRules.minWeightKg ?? 45),
    age: {
      min: Number(body.minAge ?? 17),
      max: Number(body.maxAge ?? 60),
    },
    slot: {
      minutes: 30,
      capacity: Number(body.defaultSlotCapacity ?? 4),
    },
  };

  const updated = await db.branch.upsert({
    where: { id: env.DEFAULT_BRANCH_ID },
    update: {
      name: String(body.branchName || existing?.name || "UTD PMI Kota Surabaya"),
      city: String(body.city || existing?.city || "Surabaya"),
      isSimulated: false,
      rules: nextRules,
    },
    create: {
      id: env.DEFAULT_BRANCH_ID,
      name: String(body.branchName || "UTD PMI Kota Surabaya"),
      city: String(body.city || "Surabaya"),
      isSimulated: false,
      rules: nextRules,
    },
  });

  await db.auditLog.create({
    data: {
      actorId: session?.userId || "coordinator",
      action: "UPDATE_BRANCH_SETTINGS",
      entity: "Branch",
      entityId: updated.id,
      after: {
        name: updated.name,
        city: updated.city,
        cooldownDays: nextRules.cooldownDays,
      },
    },
  });

  return NextResponse.json({ branch: updated });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "Data akun tidak valid." } },
      { status: 400 }
    );
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const password = String(body.password || "");
  const role = body.role === "ADMIN" ? "ADMIN" : "COORDINATOR";

  if (name.length < 2 || !email.includes("@") || password.length < 6) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            "Nama, alamat email yang valid, dan kata sandi (minimal 6 karakter) wajib diisi.",
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
          code: "EMAIL_EXISTS",
          message: "Alamat email tersebut sudah terdaftar.",
        },
      },
      { status: 409 }
    );
  }

  const created = await db.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      role,
      branchId: env.DEFAULT_BRANCH_ID,
    },
  });

  await db.auditLog.create({
    data: {
      actorId: session?.userId || "coordinator",
      action: "CREATE_STAFF_ACCOUNT",
      entity: "User",
      entityId: created.id,
      after: { name: created.name, email: created.email, role: created.role },
    },
  });

  return NextResponse.json(
    {
      admin: {
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
        createdAt: created.createdAt,
      },
    },
    { status: 201 }
  );
}

