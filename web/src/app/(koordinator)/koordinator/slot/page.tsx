import {
  formatDateWIB,
  formatDayDateWIB,
  formatTimeWIB,
} from "@/lib/format-tanggal";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { SlotManagerClient } from "./SlotManagerClient";

export const dynamic = "force-dynamic";

export default async function CoordinatorSlotsPage() {
  const now = new Date();
  const slots = await db.slot.findMany({
    where: {
      branchId: env.DEFAULT_BRANCH_ID,
      startsAt: {
        gte: new Date(now.getTime() - 2 * 3600 * 1000),
      },
    },
    orderBy: { startsAt: "asc" },
    take: 48,
  });

  const formatted = slots.map((s) => ({
    id: s.id,
    dayKey: formatDateWIB(s.startsAt),
    dayLabel: formatDayDateWIB(s.startsAt),
    timeLabel: formatTimeWIB(s.startsAt, true),
    capacity: s.capacity,
    bookedCount: s.bookedCount,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] leading-tight font-bold text-ink">
            Kapasitas jadwal 30 menit
          </h1>
          <p className="mt-1 max-w-[70ch] text-[15px] text-ink-soft">
            Atur jumlah kursi per sesi 30 menit atau buka jam layanan tambahan
            saat permintaan donor meningkat.
          </p>
        </div>
      </div>

      <SlotManagerClient initialSlots={formatted} />
    </div>
  );
}
