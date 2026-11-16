import { NextResponse } from "next/server";
import {
  BLOOD_GROUP_META,
  BLOOD_GROUP_ORDER,
  BloodGroupCode,
  formatRelativeTimeID,
} from "@/lib/format-tanggal";
import { db } from "@/server/db";
import { env } from "@/server/env";

export async function GET() {
  const branchId = env.DEFAULT_BRANCH_ID;
  const branch = await db.branch.findUnique({
    where: { id: branchId },
    include: {
      stock: true,
    },
  });

  if (!branch) {
    return NextResponse.json(
      {
        error: {
          code: "BRANCH_NOT_FOUND",
          message: "Data cabang UTD belum diinisialisasi.",
        },
      },
      { status: 404 }
    );
  }

  const byGroup = new Map(branch.stock.map((s) => [s.group, s]));

  let latestUpdate = new Date(0);
  const stockItems = BLOOD_GROUP_ORDER.map((groupCode) => {
    const row = byGroup.get(groupCode);
    const units = row?.units ?? 0;
    const criticalAt = row?.criticalAt ?? 3;
    const safeAt = row?.safeAt ?? 10;
    const updatedAt = row?.updatedAt ?? new Date();
    if (updatedAt > latestUpdate) {
      latestUpdate = updatedAt;
    }

    const level: "critical" | "low" | "ok" =
      units <= criticalAt ? "critical" : units < safeAt ? "low" : "ok";

    return {
      id: row?.id || groupCode,
      group: groupCode,
      display: BLOOD_GROUP_META[groupCode].display,
      spoken: BLOOD_GROUP_META[groupCode].spoken,
      units,
      criticalAt,
      safeAt,
      level,
      updatedAt: updatedAt.toISOString(),
    };
  });

  const rel = formatRelativeTimeID(
    latestUpdate.getTime() > 0 ? latestUpdate : new Date()
  );

  return NextResponse.json(
    {
      branch: {
        id: branch.id,
        name: branch.name,
        city: branch.city,
        isSimulated: branch.isSimulated,
      },
      updatedAt: latestUpdate.toISOString(),
      relativeUpdatedText: rel.text,
      isStale: rel.isStale,
      hoursElapsed: rel.hoursElapsed,
      stock: stockItems,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=10, stale-while-revalidate=15",
      },
    }
  );
}

