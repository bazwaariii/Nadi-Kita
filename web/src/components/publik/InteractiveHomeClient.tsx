"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  MapPin,
  TriangleAlert,
  UserPlus,
} from "lucide-react";
import { Chip } from "@/components/ui/StatusChip";

export interface PublicSlotItem {
  id: string;
  dayKey: string;
  dayLabel: string;
  timeLabel: string;
  capacity: number;
  bookedCount: number;
  remaining: number;
}

const FAQ_ITEMS = [
  {
    q: "Mengapa pendaftaran akun pendonor memerlukan dokumen KTP berformat PDF?",
    a: "Petugas UTD memverifikasi dokumen KTP (.PDF) untuk memastikan kesesuaian identitas, batas usia 17 sampai 60 tahun, serta menjaga agar pencatatan masa jeda 60 hari tidak terduplikasi.",
  },
  {
    q: "Bagaimana jika saya belum mengetahui kadar hemoglobin (Hb) saya?",
    a: "Anda tetap dapat memesan jadwal kedatangan. Pemeriksaan kadar hemoglobin (minimal 12,5 g/dL) dan tekanan darah dilakukan langsung oleh petugas medis di ruang pemeriksaan UTD sebelum pengambilan darah.",
  },
  {
    q: "Berapa lama jeda waktu minimal antar donor darah lengkap?",
    a: "Sesuai standar pelayanan transfusi darah, jarak minimal antar donor darah lengkap adalah 60 hari. Sistem otomatis menghitung tanggal layak donor berikutnya setelah proses donor Anda selesai dicatat.",
  },
  {
    q: "Apakah saya bisa membatalkan atau mengubah jam kehadiran yang sudah dipesan?",
    a: "Bisa. Masuk ke halaman akun pendonor, lalu tekan tombol batalkan jadwal pada tiket aktif Anda paling lambat 2 jam sebelum sesi dimulai agar kursi dapat digunakan pendonor lain.",
  },
];

export function InteractiveHomeClient({
  slots,
  branchName,
}: {
  slots: PublicSlotItem[];
  branchName: string;
}) {
  const days = Array.from(new Set(slots.map((s) => s.dayKey)));
  const [selectedDay, setSelectedDay] = useState<string>(days[0] || "");
  const [selectedSlotId, setSelectedSlotId] = useState<string>(
    slots.find((s) => s.remaining > 0)?.id || ""
  );

  const [age, setAge] = useState(27);
  const [weight, setWeight] = useState(60);
  const [neverDonated, setNeverDonated] = useState(false);
  const [lastDonationDate, setLastDonationDate] = useState(() => {
    const d = new Date(Date.now() - 75 * 24 * 60 * 60 * 1000);
    return d.toISOString().split("T")[0];
  });
  const [healthyToday, setHealthyToday] = useState(true);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const visibleSlots = slots.filter((s) => s.dayKey === selectedDay);
  const activeSlot = slots.find((s) => s.id === selectedSlotId);

  const now = new Date();
  let daysSinceLast = 999;
  let nextEligibleFormatted = "Hari ini";

  if (!neverDonated && lastDonationDate) {
    const lastDate = new Date(`${lastDonationDate}T00:00:00`);
    if (!Number.isNaN(lastDate.getTime())) {
      daysSinceLast = Math.max(
        0,
        Math.floor((now.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000))
      );
      const nextDate = new Date(
        lastDate.getTime() + 60 * 24 * 60 * 60 * 1000
      );
      nextEligibleFormatted = nextDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  }

  const cooldownRemaining = neverDonated ? 0 : Math.max(0, 60 - daysSinceLast);
  const issues: string[] = [];

  if (age < 17 || age > 60) {
    issues.push("Usia pendonor harus berada di rentang 17 sampai 60 tahun.");
  }
  if (weight < 45) {
    issues.push("Berat badan minimal untuk donor darah adalah 45 kg.");
  }
  if (cooldownRemaining > 0) {
    issues.push(
      `Masih dalam masa jeda 60 hari (tersisa ${cooldownRemaining} hari lagi, layak mulai ${nextEligibleFormatted}).`
    );
  }
  if (!healthyToday) {
    issues.push(
      "Pastikan tidur minimal 4 jam dan tidak sedang demam atau mengonsumsi antibiotik."
    );
  }

  const isEligible = issues.length === 0;
  const cooldownProgress = neverDonated
    ? 100
    : Math.min(100, Math.round((daysSinceLast / 60) * 100));

  return (
    <div className="space-y-12">
      {/* 1. Jadwal kursi donor UTD */}
      <section
        id="jadwal-utd"
        aria-labelledby="heading-jadwal-utd"
        className="scroll-mt-24 rounded-panel border border-line bg-white p-5 sm:p-7"
      >
        <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 lg:flex-row lg:items-end">
          <div>
            <h2
              id="heading-jadwal-utd"
              className="text-[24px] font-bold text-ink sm:text-[26px]"
            >
              Jadwal kursi donor (sesi 30 menit)
            </h2>
            <p className="mt-1 text-base text-ink-soft">
              Kuota kursi di {branchName} diperbarui langsung. Pilih tanggal dan
              jam kedatangan untuk menghindari antrean di lokasi.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <MapPin
              size={16}
              className="shrink-0 text-brand-strong"
              aria-hidden="true"
            />
            <span>Jl. Embong Ploso No. 7 s.d. 15, Genteng, Surabaya</span>
          </div>
        </div>

        {/* Pilihan hari */}
        <div
          role="tablist"
          aria-label="Pilih tanggal kunjungan"
          className="mt-5 flex gap-1.5 overflow-x-auto rounded-input border border-line bg-canvas p-1"
        >
          {days.map((day) => {
            const active = selectedDay === day;
            return (
              <button
                key={day}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setSelectedDay(day);
                  const firstAvail = slots.find(
                    (s) => s.dayKey === day && s.remaining > 0
                  );
                  if (firstAvail) setSelectedSlotId(firstAvail.id);
                }}
                className={`h-10 shrink-0 rounded-[6px] px-4 text-sm transition-colors duration-150 ${
                  active
                    ? "bg-white font-bold text-ink shadow-[0_1px_2px_rgba(28,25,23,0.08)]"
                    : "font-medium text-ink-soft hover:text-ink"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Daftar jam sesi 30 menit */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {visibleSlots.map((slot) => {
            const isFull = slot.remaining === 0;
            const isSelected = selectedSlotId === slot.id;
            return (
              <button
                key={slot.id}
                type="button"
                disabled={isFull}
                onClick={() => setSelectedSlotId(slot.id)}
                aria-pressed={isSelected}
                className={`flex min-h-[68px] flex-col justify-between rounded-input border p-3.5 text-left tabular-nums transition-colors duration-150 ${
                  isFull
                    ? "cursor-not-allowed border-line bg-canvas text-ink-muted"
                    : isSelected
                      ? "border-2 border-brand bg-blush text-ink"
                      : "border-field bg-white text-ink hover:bg-canvas"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">{slot.timeLabel}</span>
                  {isSelected && !isFull && (
                    <CheckCircle2
                      size={16}
                      className="text-brand-strong"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-bold ${
                    isFull
                      ? "text-ink-muted"
                      : isSelected
                        ? "text-brand-strong"
                        : "text-ok-ink"
                  }`}
                >
                  {isFull
                    ? "Penuh"
                    : `Sisa ${slot.remaining} dari ${slot.capacity} kursi`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bilah konfirmasi slot terpilih */}
        <div className="mt-5 flex flex-col justify-between gap-4 rounded-input border border-line bg-canvas p-4 sm:flex-row sm:items-center">
          <div>
            {activeSlot ? (
              <p className="text-sm text-ink tabular-nums">
                Jadwal dipilih:{" "}
                <strong className="font-bold">
                  {activeSlot.dayLabel}, pukul {activeSlot.timeLabel} WIB
                </strong>{" "}
                ({activeSlot.remaining} kursi tersisa).
              </p>
            ) : (
              <p className="text-sm text-ink-soft">
                Pilih salah satu jam layanan di atas untuk memesan kursi donor.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={
                selectedSlotId
                  ? `/donor?slotId=${encodeURIComponent(selectedSlotId)}`
                  : "/donor"
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong"
            >
              <CalendarClock size={16} aria-hidden="true" />
              <span>Pesan dengan akun donor</span>
            </Link>
            <Link
              href="/daftar"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-input border border-field bg-white px-4 text-sm font-bold text-ink transition-colors duration-150 hover:bg-white/80"
            >
              <UserPlus size={16} aria-hidden="true" />
              <span>Daftar pendonor baru</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Kalkulator kesiapan & masa jeda 60 hari */}
      <section
        id="cek-kelayakan"
        aria-labelledby="heading-kalkulator"
        className="scroll-mt-24 rounded-panel border border-line bg-white p-5 sm:p-7"
      >
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="space-y-5 lg:col-span-7">
            <div>
              <h2
                id="heading-kalkulator"
                className="text-[24px] font-bold text-ink sm:text-[26px]"
              >
                Cek kelayakan & masa jeda 60 hari
              </h2>
              <p className="mt-1 text-base text-ink-soft">
                Masukkan tanggal donor terakhir dan kondisi fisik Anda untuk
                mengetahui apakah Anda sudah dapat menjadwalkan donor hari ini.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="calc-age"
                  className="block text-sm font-bold text-ink"
                >
                  Usia saat ini
                </label>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <input
                    id="calc-age"
                    type="number"
                    min={15}
                    max={75}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value) || 0)}
                    className="h-11 w-28 rounded-input border border-field bg-white px-3 text-base font-bold text-ink tabular-nums focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                  />
                  <span className="text-sm text-ink-soft">
                    tahun (syarat 17 s.d. 60)
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="calc-weight"
                  className="block text-sm font-bold text-ink"
                >
                  Berat badan
                </label>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <input
                    id="calc-weight"
                    type="number"
                    min={35}
                    max={160}
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value) || 0)}
                    className="h-11 w-28 rounded-input border border-field bg-white px-3 text-base font-bold text-ink tabular-nums focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                  />
                  <span className="text-sm text-ink-soft">
                    kg (minimal 45 kg)
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-input border border-line bg-canvas p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="calc-last-date"
                  className="text-sm font-bold text-ink"
                >
                  Tanggal donor darah terakhir
                </label>
                <label className="inline-flex min-h-9 items-center gap-2 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={neverDonated}
                    onChange={(e) => setNeverDonated(e.target.checked)}
                    className="h-5 w-5 accent-[#C8102E]"
                  />
                  <span>Belum pernah donor sebelumnya</span>
                </label>
              </div>

              {!neverDonated && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    id="calc-last-date"
                    type="date"
                    max={now.toISOString().split("T")[0]}
                    value={lastDonationDate}
                    onChange={(e) => setLastDonationDate(e.target.value)}
                    className="h-11 rounded-input border border-field bg-white px-3.5 text-base text-ink tabular-nums focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                  />
                  <span className="text-sm text-ink-muted tabular-nums">
                    {daysSinceLast} hari yang lalu (jeda minimal 60 hari)
                  </span>
                </div>
              )}
            </div>

            <label className="flex min-h-12 items-center gap-3 rounded-input border border-line bg-canvas px-4 py-3 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={healthyToday}
                onChange={(e) => setHealthyToday(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-[#C8102E]"
              />
              <span>
                Tidur cukup semalam (minimal 4 jam), tidak sedang demam, dan
                tidak sedang minum antibiotik.
              </span>
            </label>
          </div>

          {/* Hasil perhitungan */}
          <div className="lg:col-span-5">
            <div className="rounded-panel border border-line bg-canvas p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {isEligible ? (
                  <Chip tone="ok" Icon={CheckCircle2}>
                    Layak menjadwalkan donor
                  </Chip>
                ) : (
                  <Chip tone="warn" Icon={Clock}>
                    Belum dapat donor hari ini
                  </Chip>
                )}

                <span className="text-xs font-bold text-ink-muted tabular-nums">
                  Masa jeda {cooldownProgress}%
                </span>
              </div>

              <h3 className="mt-4 text-xl font-bold text-ink">
                {isEligible
                  ? "Anda memenuhi syarat pemeriksaan awal"
                  : "Ada syarat yang belum terpenuhi"}
              </h3>

              <div className="mt-4">
                <div className="flex justify-between text-xs font-bold text-ink-soft tabular-nums">
                  <span>Pemulihan masa jeda 60 hari</span>
                  <span>{cooldownProgress}%</span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-input border border-line-strong bg-white">
                  <div
                    className={`h-full transition-all duration-300 ${
                      cooldownProgress >= 100 ? "bg-ok-ink" : "bg-brand"
                    }`}
                    style={{ width: `${cooldownProgress}%` }}
                  />
                </div>
              </div>

              {isEligible ? (
                <p className="mt-4 text-sm leading-relaxed text-ink-soft tabular-nums">
                  Berdasarkan usia ({age} tahun), berat badan ({weight} kg), dan
                  riwayat masa jeda, Anda dapat memesan jadwal kehadiran di UTD
                  hari ini.
                </p>
              ) : (
                <ul className="mt-4 space-y-2 text-sm text-ink">
                  {issues.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <TriangleAlert
                        size={16}
                        className="mt-0.5 shrink-0 text-brand-strong"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 border-t border-line pt-4">
                <Link
                  href="/daftar"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong"
                >
                  <UserPlus size={16} aria-hidden="true" />
                  <span>Daftar & unggah KTP PDF</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Pertanyaan umum (FAQ) */}
      <section aria-labelledby="heading-faq" className="space-y-4">
        <div>
          <h2
            id="heading-faq"
            className="text-[24px] font-bold text-ink sm:text-[26px]"
          >
            Pertanyaan yang sering diajukan
          </h2>
          <p className="mt-1 text-base text-ink-soft">
            Panduan singkat bagi masyarakat yang ingin berdonor di {branchName}.
          </p>
        </div>

        <div className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-white">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div key={idx}>
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-bold text-ink transition-colors duration-150 hover:bg-canvas"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    size={18}
                    aria-hidden="true"
                    className={`shrink-0 text-ink-soft transition-transform duration-150 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-line bg-canvas/60 px-5 py-4 text-sm leading-relaxed text-ink-soft">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
