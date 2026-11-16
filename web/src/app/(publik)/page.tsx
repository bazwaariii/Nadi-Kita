import Link from "next/link";
import { CalendarClock, Clock, MapPin, UserPlus } from "lucide-react";
import {
  formatDateWIB,
  formatDayDateWIB,
  formatTimeWIB,
} from "@/lib/format-tanggal";
import {
  InteractiveHomeClient,
  type PublicSlotItem,
} from "@/components/publik/InteractiveHomeClient";
import { LiveStockBoard } from "@/components/stok/LiveStockBoard";
import { Logo } from "@/components/ui/Logo";
import { PublicHeader } from "@/components/ui/Navigation";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { getInitialStockSnapshot } from "@/server/services/stock-view";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const [initialStock, rawSlots] = await Promise.all([
    getInitialStockSnapshot(),
    db.slot.findMany({
      where: {
        branchId: env.DEFAULT_BRANCH_ID,
        startsAt: {
          gte: new Date(now.getTime() - 2 * 3600 * 1000),
          lte: new Date(now.getTime() + 5 * 24 * 3600 * 1000),
        },
      },
      orderBy: { startsAt: "asc" },
      take: 48,
    }),
  ]);

  const publicSlots: PublicSlotItem[] = rawSlots.map((s) => ({
    id: s.id,
    dayKey: formatDateWIB(s.startsAt),
    dayLabel: formatDayDateWIB(s.startsAt),
    timeLabel: formatTimeWIB(s.startsAt),
    capacity: s.capacity,
    bookedCount: s.bookedCount,
    remaining: Math.max(0, s.capacity - s.bookedCount),
  }));

  const steps = [
    {
      num: "1",
      title: "Lihat stok & masa jeda",
      body: "Periksa golongan darah yang sedang menipis di UTD dan pastikan jarak dari donor terakhir Anda sudah mencapai minimal 60 hari.",
    },
    {
      num: "2",
      title: "Daftar & unggah KTP PDF",
      body: "Buat akun pendonor dengan melampirkan dokumen KTP berformat PDF agar identitas dan riwayat masa jeda Anda terverifikasi.",
    },
    {
      num: "3",
      title: "Pilih jadwal 30 menit",
      body: "Kunci jam kehadiran sesuai kuota kursi yang tersedia sehingga Anda tidak perlu mengantre panjang di ruang tunggu UTD.",
    },
    {
      num: "4",
      title: "Tunjukkan tiket QR di UTD",
      body: "Petugas memindai tiket QR Anda saat tiba di lokasi, melakukan pemeriksaan hemoglobin singkat, dan mencatat hasil donor.",
    },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <PublicHeader />

      <main
        id="konten-utama"
        className="mx-auto max-w-[1200px] space-y-12 px-4 py-8 sm:px-6 lg:px-8 lg:py-12"
      >
        {/* Pengantar layanan & papan stok langsung */}
        <section className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="space-y-5 lg:col-span-5 lg:pt-1">
            <p className="text-sm font-bold text-brand-strong">
              {initialStock.branch.name}
            </p>

            <h1 className="text-[34px] leading-[1.15] font-bold text-ink sm:text-[42px]">
              Darah yang dibutuhkan hari ini, dijadwalkan tanpa antrean.
            </h1>

            <p className="max-w-[62ch] text-base leading-relaxed text-ink-soft">
              Lihat ketersediaan kantong darah secara langsung, cek hitungan
              masa jeda 60 hari Anda, lalu pesan kursi donor berdurasi 30 menit
              di {initialStock.branch.name}.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/#jadwal-utd"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-input bg-brand px-5 text-base font-bold text-white transition-colors duration-150 hover:bg-brand-strong"
              >
                <CalendarClock size={18} aria-hidden="true" />
                <span>Pesan jadwal donor</span>
              </Link>

              <Link
                href="/daftar"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-input border border-field bg-white px-5 text-base font-bold text-ink transition-colors duration-150 hover:bg-canvas"
              >
                <UserPlus size={18} aria-hidden="true" />
                <span>Daftar pendonor baru</span>
              </Link>
            </div>

            <dl className="divide-y divide-line rounded-panel border border-line bg-white text-sm">
              <div className="flex items-start gap-3 p-4">
                <MapPin
                  size={18}
                  className="mt-0.5 shrink-0 text-brand-strong"
                  aria-hidden="true"
                />
                <div>
                  <dt className="font-bold text-ink">
                    Lokasi {initialStock.branch.name}
                  </dt>
                  <dd className="mt-0.5 text-ink-soft">
                    Jl. Embong Ploso No. 7 s.d. 15, Kec. Genteng, Kota Surabaya
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4">
                <Clock
                  size={18}
                  className="mt-0.5 shrink-0 text-brand-strong"
                  aria-hidden="true"
                />
                <div>
                  <dt className="font-bold text-ink">
                    Jam operasional pengambilan darah
                  </dt>
                  <dd className="mt-0.5 text-ink-soft">
                    Setiap hari pukul 08.00 s.d. 20.00 WIB, sesi terjadwal per
                    30 menit
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          <div className="lg:col-span-7">
            <LiveStockBoard initialData={initialStock} columns={1} />
          </div>
        </section>

        {/* Jadwal kursi UTD langsung & kalkulator masa jeda */}
        <InteractiveHomeClient
          slots={publicSlots}
          branchName={initialStock.branch.name}
        />

        {/* Alur pelayanan 4 langkah (berurutan sehingga diberi nomor) */}
        <section
          id="cara-kerja"
          aria-labelledby="heading-cara-kerja"
          className="scroll-mt-24 border-t border-line pt-10"
        >
          <h2
            id="heading-cara-kerja"
            className="text-[26px] font-bold text-ink"
          >
            Cara kerja donor terjadwal
          </h2>
          <p className="mt-1 max-w-[68ch] text-base text-ink-soft">
            Empat langkah berurutan mulai dari memeriksa stok hingga pencatatan
            donor di lokasi UTD.
          </p>

          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <li
                key={step.num}
                className="rounded-panel border border-line bg-white p-5"
              >
                <div className="flex items-baseline gap-2.5">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-input bg-blush text-sm font-bold text-brand-strong tabular-nums">
                    {step.num}
                  </span>
                  <h3 className="text-base font-bold text-ink">{step.title}</h3>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="mt-16 border-t border-line bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-6 px-4 py-10 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="space-y-1.5">
            <Logo href="/" subtitle={initialStock.branch.name} />
            <p className="max-w-md text-sm text-ink-muted">
              Penjadwalan donor darah sukarela dan pemantauan stok kantong darah
              berbasis aturan masa jeda 60 hari.
            </p>
          </div>

          <nav
            aria-label="Tautan kaki halaman"
            className="flex flex-wrap gap-6 text-sm font-medium text-ink-soft"
          >
            <Link href="/stok" className="hover:text-brand-strong">
              Stok darah
            </Link>
            <Link href="/#jadwal-utd" className="hover:text-brand-strong">
              Jadwal donor
            </Link>
            <Link href="/daftar" className="hover:text-brand-strong">
              Daftar pendonor
            </Link>
            <Link href="/masuk" className="hover:text-brand-strong">
              Masuk akun
            </Link>
            <Link href="/koordinator" className="hover:text-brand-strong">
              Konsol petugas UTD
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
