import {
  BLOOD_GROUP_META,
  BloodGroupCode,
  formatDayDateWIB,
  formatTimeWIB,
} from "@/lib/format-tanggal";
import { Chip } from "@/components/ui/StatusChip";
import { db } from "@/server/db";
import { QueueScannerClient } from "./QueueScannerClient";

export const dynamic = "force-dynamic";

export default async function CoordinatorQueuePage() {
  const now = new Date();
  const slots = await db.slot.findMany({
    where: {
      startsAt: {
        gte: new Date(now.getTime() - 4 * 3600 * 1000),
        lte: new Date(now.getTime() + 24 * 3600 * 1000),
      },
    },
    include: {
      bookings: {
        include: {
          donor: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { startsAt: "asc" },
    take: 10,
  });

  const formattedSlots = slots.map((s) => ({
    id: s.id,
    timeLabel: formatTimeWIB(s.startsAt, true),
    capacity: s.capacity,
    bookedCount: s.bookedCount,
    bookings: s.bookings.map((b) => ({
      id: b.id,
      code: b.code,
      displayCode: `NK-${b.code}`,
      donorName: b.donor.fullName,
      bloodGroupDisplay:
        BLOOD_GROUP_META[b.donor.bloodGroup as BloodGroupCode]?.display ||
        b.donor.bloodGroup,
      status: b.status,
      outcomeNote: b.outcomeNote || null,
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] leading-tight font-bold text-ink">
            Antrean & pemindai tiket QR
          </h1>
          <p className="mt-1 max-w-[70ch] text-[15px] text-ink-soft">
            Pindai tiket QR atau masukkan kode tiket, lalu catat hasil donor
            untuk menambah stok kantong dan memulai ulang masa jeda 60 hari.
          </p>
        </div>
        <Chip tone="neutral">{formatDayDateWIB(now)}</Chip>
      </div>

      <QueueScannerClient initialSlots={formattedSlots} />
    </div>
  );
}
