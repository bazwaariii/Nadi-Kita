import { BloodGroup } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { BloodGroupEnum, PatchStockSchema } from "@/lib/zod-schemas";
import { getSessionUser } from "@/server/auth";
import { db } from "@/server/db";
import { env } from "@/server/env";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ group: string }> }
) {
  const { group } = await context.params;
  const parsedGroup = BloodGroupEnum.safeParse(group);
  if (!parsedGroup.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BLOOD_GROUP",
          message: "Golongan darah tidak dikenali.",
        },
      },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsedBody = PatchStockSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            parsedBody.error.issues[0]?.message ||
            "Data pembaruan stok tidak valid.",
        },
      },
      { status: 400 }
    );
  }

  const session = await getSessionUser();
  if (session && session.role === "DONOR") {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Hanya koordinator UTD yang dapat memperbarui stok darah.",
        },
      },
      { status: 403 }
    );
  }

  const actorId = session?.userId || "usr_coord_01";
  const branchId = env.DEFAULT_BRANCH_ID;
  const groupCode = parsedGroup.data as BloodGroup;

  const existing = await db.stockLevel.findUnique({
    where: {
      branchId_group: {
        branchId,
        group: groupCode,
      },
    },
  });

  if (!existing) {
    return NextResponse.json(
      {
        error: {
          code: "STOCK_NOT_FOUND",
          message: "Data stok golongan darah tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  const newUnits = parsedBody.data.units;
  const newCriticalAt = parsedBody.data.criticalAt ?? existing.criticalAt;
  const newSafeAt = parsedBody.data.safeAt ?? existing.safeAt;

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.stockLevel.update({
      where: { id: existing.id },
      data: {
        units: newUnits,
        criticalAt: newCriticalAt,
        safeAt: newSafeAt,
        updatedBy: actorId,
      },
    });

    // BR-13: Perubahan stok selalu menulis AuditLog (sebelum, sesudah, aktor, alasan)
    await tx.auditLog.create({
      data: {
        actorId,
        action: "STOCK_UPDATED",
        entity: "StockLevel",
        entityId: existing.id,
        before: {
          group: existing.group,
          units: existing.units,
          criticalAt: existing.criticalAt,
          safeAt: existing.safeAt,
        },
        after: {
          group: row.group,
          units: row.units,
          criticalAt: row.criticalAt,
          safeAt: row.safeAt,
          reason: parsedBody.data.reason,
        },
      },
    });

    return row;
  });

  return NextResponse.json({ stock: updated });
}

