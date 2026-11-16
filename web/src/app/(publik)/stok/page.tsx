import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { LiveStockBoard } from "@/components/stok/LiveStockBoard";
import { PublicHeader } from "@/components/ui/Navigation";
import { getInitialStockSnapshot } from "@/server/services/stock-view";

export const dynamic = "force-dynamic";

export default async function PublicStockPage() {
  const initialStock = await getInitialStockSnapshot();

  return (
    <div className="min-h-screen bg-canvas">
      <PublicHeader />

      <main
        id="konten-utama"
        className="mx-auto max-w-[1200px] space-y-6 px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div>
            <h1 className="text-[30px] leading-tight font-bold text-ink sm:text-[36px]">
              Papan stok darah langsung
            </h1>
            <p className="mt-1 max-w-[68ch] text-base text-ink-soft">
              Pantau ketersediaan kantong darah di {initialStock.branch.name}.
              Data diperbarui otomatis setiap 12 detik.
            </p>
          </div>

          <Link
            href="/donor"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong"
          >
            <CalendarClock size={16} aria-hidden="true" />
            <span>Lihat jadwal donor saya</span>
          </Link>
        </div>

        <LiveStockBoard initialData={initialStock} columns={2} />

        <section className="rounded-panel border border-line bg-white p-6">
          <h2 className="text-xl font-bold text-ink">
            Mengapa kedatangan diatur dalam sesi 30 menit?
          </h2>
          <p className="mt-2 max-w-[70ch] text-base leading-relaxed text-ink-soft">
            Saat satu golongan darah menipis, panggilan terbuka di media sosial
            sering membuat antrean menumpuk di satu jam atau justru memanggil
            pendonor yang belum melewati masa jeda 60 hari. Di Nadi Kita,
            undangan dikirim ke pendonor yang sudah memenuhi masa jeda dan
            setiap sesi 30 menit memiliki kuota kursi yang terukur.
          </p>
        </section>
      </main>
    </div>
  );
}
