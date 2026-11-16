import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  hashPassword,
  SESSION_COOKIE_NAME,
} from "@/server/auth";
import { db } from "@/server/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  if (!email) {
    return NextResponse.json(
      {
        error: {
          code: "EMAIL_REQUIRED",
          message: "Masukkan alamat email Anda.",
        },
      },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({
    where: { email },
    include: { donorProfile: true },
  });

  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_CREDENTIALS",
          message:
            "Akun tidak ditemukan. Periksa kembali alamat email Anda atau daftar sebagai pendonor baru.",
        },
      },
      { status: 401 }
    );
  }

  // Izinkan login cepat demo atau verifikasi kata sandi
  if (
    password &&
    password !== "nadikita2026" &&
    hashPassword(password) !== user.passwordHash
  ) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_CREDENTIALS",
          message:
            "Kata sandi tidak cocok. Untuk akun demo gunakan nadikita2026.",
        },
      },
      { status: 401 }
    );
  }

  const token = createSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    donorId: user.donorProfile?.id || null,
  });

  const redirectTo =
    user.role === "COORDINATOR" || user.role === "ADMIN"
      ? "/koordinator"
      : "/donor";

  const res = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      donorId: user.donorProfile?.id || null,
    },
    redirectTo,
  });

  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });

  return res;
}

