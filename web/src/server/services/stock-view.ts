import {
  BLOOD_GROUP_META,
  BLOOD_GROUP_ORDER,
  formatRelativeTimeID,
} from "@/lib/format-tanggal";
import { StockApiResponse } from "@/components/stok/LiveStockBoard";
import { db } from "@/server/db";
import { env } from "@/server/env";

export async function getInitialStockSnapshot(): Promise<StockApiResponse> {
  const branchId = env.DEFAULT_BRANCH_ID;
  let branch: any = null;
  try {
    branch = await db.branch.findUnique({
      where: { id: branchId },
      include: { stock: true },
    });
  } catch (err) {
    console.warn("Could not query branch from DB, using fallback snapshot:", err);
  }

  const byGroup = new Map<string, any>(
    (branch?.stock || []).map((s: any) => [s.group, s])
  );
  let latestUpdate = new Date(0);

  const stock = BLOOD_GROUP_ORDER.map((groupCode) => {
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

  const validLatest =
    latestUpdate.getTime() > 0 ? latestUpdate : new Date();
  const rel = formatRelativeTimeID(validLatest);

  return {
    branch: {
      id: branch?.id || branchId,
      name: branch?.name || "UTD PMI Kota Surabaya",
      city: branch?.city || "Surabaya",
      isSimulated: branch?.isSimulated ?? false,
    },
    updatedAt: validLatest.toISOString(),
    relativeUpdatedText: rel.text,
    isStale: rel.isStale,
    hoursElapsed: rel.hoursElapsed,
    stock,
  };
}

