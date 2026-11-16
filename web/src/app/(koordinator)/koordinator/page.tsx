import Link from "next/link";
import {
  Droplet,
  FileCheck2,
  ScanLine,
  Settings,
  TriangleAlert,
  Users,
} from "lucide-react";
import {
  BLOOD_GROUP_META,
  BloodGroupCode,
  formatDayDateWIB,
  formatTimeWIB,
} from "@/lib/format-tanggal";
import { LiveStockBoard } from "@/components/stok/LiveStockBoard";
import { Chip } from "@/components/ui/StatusChip";
import { db } from "@/server/db";
import { getInitialStockSnapshot } from "@/server/services/stock-view";

export const dynamic = "force-dynamic";

export default async function CoordinatorDashboardPage() {
  const initialStock = await getInitialStockSnapshot();

  const criticalGroups = initialStock.stock
    .filter((s) => s.level === "critical")
    .map((s) => s.display);

  const [activeCampaigns, totalDonors, pendingKtpCount] = await Promise.all([
    db.campaign.findMany({
      where: { status: "ACTIVE" },
      include: {
        invitations: {
          select: { status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    db.donorProfile.count(),
    db.donorProfile.count({ where: { ktpVerified: false } }),
  ]);

  const now = new Date();
  const todaySlots = await db.slot.findMany({
    where: {
      startsAt: {
        gte: new Date(now.getTime() - 2 * 3600 * 1000),
        lte: new Date(now.getTime() + 18 * 3600 * 1000),
      },
    },
    include: {
      bookings: {
        where: {
          status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
        },
      },
    },
    orderBy: { startsAt: "asc" },
    take: 5,
  });

  return (
    <div className="space-y-6">
      {/* Header halaman konsol */}
      <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] leading-tight font-bold text-ink">
            {initialStock.branch.name}
          </h1>
          <p className="mt-1 max-w-[70ch] text-[15px] text-ink-soft">
            Pantau stok kantong darah, undang pendonor yang sudah melewati masa
            jeda 60 hari, verifikasi PDF KTP, dan kelola antrean QR.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/koordinator/stok"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-input border border-field bg-white px-4 text-sm font-bold text-ink transition-colors duration-150 hover:bg-canvas"
          >
            <Droplet size={16} aria-hidden="true" />
            <span>Perbarui stok</span>
          </Link>
          <Link
            href="/koordinator/pendonor"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-input border border-field bg-white px-4 text-sm font-bold text-ink transition-colors duration-150 hover:bg-canvas tabular-nums"
          >
            <FileCheck2 size={16} aria-hidden="true" />
            <span>Verifikasi KTP ({pendingKtpCount})</span>
          </Link>
          <Link
            href="/koordinator/permintaan/baru"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong"
          >
            <Users size={16} aria-hidden="true" />
            <span>Buat permintaan donor</span>
          </Link>
        </div>
      </div>

      {/* Pita KPI operasional (4 kartu) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div
          className={`rounded-panel border p-4 ${
            criticalGroups.length > 0
              ? "border-brand/40 bg-blush/40"
              : "border-line bg-white"
          }`}
        >
          <p className="text-sm text-ink-muted">Golongan kritis</p>
          <p className="mt-1 text-[26px] leading-none font-bold text-ink tabular-nums">
            {criticalGroups.length > 0 ? criticalGroups.join(", ") : "Tidak ada"}
          </p>
        </div>

        <div className="rounded-panel border border-line bg-white p-4">
          <p className="text-sm text-ink-muted">Permintaan aktif</p>
          <p className="mt-1 text-[26px] leading-none font-bold text-ink tabular-nums">
            {activeCampaigns.length}{" "}
            <span className="text-sm font-medium text-ink-muted">kampanye</span>
          </p>
        </div>

        <div className="rounded-panel border border-line bg-white p-4">
          <p className="text-sm text-ink-muted">Pendonor terdaftar</p>
          <p className="mt-1 text-[26px] leading-none font-bold text-ink tabular-nums">
            {totalDonors}{" "}
            <span className="text-sm font-medium text-ink-muted">orang</span>
          </p>
        </div>

        <div className="rounded-panel border border-line bg-white p-4">
          <p className="text-sm text-ink-muted">KTP perlu diperiksa</p>
          <p className="mt-1 text-[26px] leading-none font-bold text-ink tabular-nums">
            {pendingKtpCount}{" "}
            <span className="text-sm font-medium text-ink-muted">
              dokumen PDF
            </span>
          </p>
        </div>
      </div>

      {/* Peringatan stok kritis */}
      {criticalGroups.length > 0 && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-brand/30 bg-blush px-4 py-3 text-sm text-ink"
        >
          <div className="flex items-center gap-2.5">
            <TriangleAlert
              size={18}
              className="shrink-0 text-brand-strong"
              aria-hidden="true"
            />
            <span>
              Golongan <strong className="font-bold">{criticalGroups.join(" dan ")}</strong>{" "}
              berada di bawah ambang kritis. Buat permintaan donor untuk
              mengundang kandidat yang sudah melewati masa jeda 60 hari.
            </span>
          </div>
          <Link
            href={`/koordinator/permintaan/baru?group=${
              initialStock.stock.find((s) => s.level === "critical")?.group ||
              "O_NEG"
            }`}
            className="font-bold text-brand-strong underline-offset-4 hover:underline"
          >
            Buat permintaan
          </Link>
        </div>
      )}

      {/* Papan stok 8 golongan */}
      <LiveStockBoard
        initialData={initialStock}
        columns={2}
        mode="coordinator"
      />

      {/* Dua panel bawah: Permintaan aktif & Antrean hari ini */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="heading-active-campaigns"
          className="rounded-panel border border-line bg-white"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2
              id="heading-active-campaigns"
              className="text-[17px] font-bold text-ink"
            >
              Permintaan donor aktif
            </h2>
            <Link
              href="/koordinator/permintaan/baru"
              className="text-sm font-bold text-brand-strong hover:underline"
            >
              Tambah baru
            </Link>
          </div>

          <div className="p-4">
            {activeCampaigns.length === 0 ? (
              <div className="py-4">
                <p className="text-sm text-ink-soft">
                  Belum ada permintaan donor aktif. Buat permintaan saat stok
                  satu golongan darah menipis.
                </p>
                <div className="mt-3">
                  <Link
                    href="/koordinator/permintaan/baru"
                    className="inline-flex h-10 items-center justify-center rounded-input border border-field bg-white px-4 text-sm font-bold text-ink hover:bg-canvas"
                  >
                    Buat permintaan donor
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeCampaigns.map((cmp) => {
                  const bookedCount = cmp.invitations.filter(
                    (i) => i.status === "BOOKED"
                  ).length;
                  const gDisplay =
                    BLOOD_GROUP_META[cmp.group as BloodGroupCode]?.display ||
                    cmp.group;
                  return (
                    <Link
                      key={cmp.id}
                      href={`/koordinator/permintaan/${cmp.id}`}
                      className="block rounded-input border border-line bg-canvas p-3.5 transition-colors duration-150 hover:border-line-strong hover:bg-blush/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-base font-bold text-ink tabular-nums">
                          Golongan {gDisplay} ({cmp.targetUnits} kantong)
                        </p>
                        <Chip tone="brand" size="sm">
                          {bookedCount}/{cmp.targetUnits} terjadwal
                        </Chip>
                      </div>
                      <p className="mt-1 text-sm text-ink-soft tabular-nums">
                        {cmp.invitations.length} pendonor diundang, batas{" "}
                        {formatDayDateWIB(cmp.deadlineAt)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section
          aria-labelledby="heading-today-queue"
          className="rounded-panel border border-line bg-white"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2
              id="heading-today-queue"
              className="text-[17px] font-bold text-ink"
            >
              Jadwal & antrean hari ini
            </h2>
            <Link
              href="/koordinator/antrean"
              className="text-sm font-bold text-brand-strong hover:underline"
            >
              Buka antrean QR
            </Link>
          </div>

          <div className="p-4">
            {todaySlots.length === 0 ? (
              <p className="py-4 text-sm text-ink-soft">
                Belum ada jadwal untuk hari ini.
              </p>
            ) : (
              <div className="space-y-2">
                {todaySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between rounded-input border border-line bg-canvas px-3.5 py-2.5 text-sm tabular-nums"
                  >
                    <span className="font-bold text-ink">
                      {formatTimeWIB(slot.startsAt, true)}
                    </span>
                    <span className="text-ink-soft">
                      {slot.bookedCount} dari {slot.capacity} kursi terisi
                    </span>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link
                    href="/koordinator/antrean"
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-input border border-field bg-white px-3.5 text-sm font-bold text-ink hover:bg-canvas"
                  >
                    <ScanLine size={16} aria-hidden="true" />
                    <span>Pindai tiket QR</span>
                  </Link>
                  <Link
                    href="/koordinator/pengaturan"
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-input border border-field bg-white px-3.5 text-sm font-bold text-ink hover:bg-canvas"
                  >
                    <Settings size={16} aria-hidden="true" />
                    <span>Pengaturan UTD</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
