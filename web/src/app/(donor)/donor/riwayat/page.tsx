import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";
import { formatDateWIB } from "@/lib/format-tanggal";
import { DonorNavigation } from "@/components/ui/Navigation";
import { Chip } from "@/components/ui/StatusChip";
import { getSessionUser } from "@/server/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function DonorHistoryPage() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/masuk");
  }
  if (session.role === "ADMIN" || session.role === "COORDINATOR") {
    redirect("/koordinator");
  }

  const donor = session.donorId
    ? await db.donorProfile.findUnique({ where: { id: session.donorId } })
    : null;

  const donations = donor
    ? await db.donation.findMany({
        where: { donorId: donor.id },
        orderBy: { donatedAt: "desc" },
      })
    : [];

  return (
    <div className="min-h-screen bg-canvas pb-24 md:pb-10">
      <DonorNavigation />

      <main
        id="konten-utama"
        className="mx-auto max-w-[760px] px-4 py-6 sm:py-8"
      >
        <h1 className="text-[28px] leading-tight font-bold text-ink">
          Riwayat donor
        </h1>
        <p className="mt-1 text-base text-ink-soft">
          Catatan donor darah Anda di UTD PMI Kota Surabaya.
        </p>

        {donations.length === 0 ? (
          <div className="mt-6 rounded-panel border border-line bg-white p-6">
            <Clock
              size={36}
              className="text-ink-muted"
              aria-hidden="true"
            />
            <p className="mt-3 text-base text-ink">
              Belum ada riwayat donor. Riwayat akan muncul setelah donor pertama
              Anda selesai dicatat oleh petugas UTD.
            </p>
            <div className="mt-5">
              <Link
                href="/donor"
                className="inline-flex h-11 items-center justify-center rounded-input bg-brand px-4 text-sm font-bold text-white hover:bg-brand-strong"
              >
                Kembali ke beranda
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-panel border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line-strong bg-canvas">
                  <th className="h-11 px-4 text-[13px] font-bold text-ink-soft">
                    Tanggal donor
                  </th>
                  <th className="h-11 px-4 text-[13px] font-bold text-ink-soft">
                    Lokasi
                  </th>
                  <th className="h-11 px-4 text-right text-[13px] font-bold text-ink-soft">
                    Volume
                  </th>
                  <th className="h-11 px-4 text-[13px] font-bold text-ink-soft">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-line last:border-b-0 hover:bg-canvas/70"
                  >
                    <td className="px-4 py-3 font-bold text-ink tabular-nums">
                      {formatDateWIB(d.donatedAt)}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      UTD PMI Kota Surabaya
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-ink tabular-nums">
                      {d.volumeMl} mL
                    </td>
                    <td className="px-4 py-3">
                      <Chip tone="ok" Icon={CheckCircle2}>
                        Selesai donor
                      </Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
