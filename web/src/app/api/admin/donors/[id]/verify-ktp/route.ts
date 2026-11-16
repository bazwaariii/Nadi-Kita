import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { db } from "@/server/db";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getSessionUser();
  if (session && session.role === "DONOR") {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Hanya Admin / Koordinator UTD yang dapat memverifikasi KTP.",
        },
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const verified = Boolean(body?.verified);
  const actorId = session?.userId || "usr_coord_01";

  const existing = await db.donorProfile.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      {
        error: {
          code: "DONOR_NOT_FOUND",
          message: "Data pendonor tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  const updated = await db.$transaction(async (tx) => {
    const d = await tx.donorProfile.update({
      where: { id },
      data: { ktpVerified: verified },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: verified ? "KTP_VERIFIED" : "KTP_UNVERIFIED",
        entity: "DonorProfile",
        entityId: id,
        before: { ktpVerified: existing.ktpVerified },
        after: { ktpVerified: verified },
      },
    });

    return d;
  });

  return NextResponse.json({
    donor: {
      id: updated.id,
      fullName: updated.fullName,
      ktpVerified: updated.ktpVerified,
    },
  });
}

