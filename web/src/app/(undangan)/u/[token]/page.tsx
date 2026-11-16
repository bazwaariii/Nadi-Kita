"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, Clock, TriangleAlert } from "lucide-react";
import {
  BLOOD_GROUP_META,
  BloodGroupCode,
  formatDateWIB,
  formatDayDateWIB,
  formatTimeWIB,
} from "@/lib/format-tanggal";
import { QrTicketCard } from "@/components/tiket/QrTicketCard";
import { Logo } from "@/components/ui/Logo";
import { Chip } from "@/components/ui/StatusChip";

interface SlotItem {
  id: string;
  startsAt: string;
  endsAt: string;
  dayKey: string;
  dayLabel: string;
  timeLabel: string;
  capacity: number;
  bookedCount: number;
  remaining: number;
  isFull: boolean;
}

interface InvitationData {
  id: string;
  status: string;
  expiresAt: string;
  campaign: {
    id: string;
    group: BloodGroupCode;
    targetUnits: number;
    deadlineAt: string;
    branchName: string;
  };
  donor: {
    id: string;
    fullName: string;
    bloodGroup: BloodGroupCode;
    lastDonationAt: string | null;
  };
  screening: {
    weightKg: number;
    sleepHours: number;
    hbStatus: "OK" | "LOW" | "UNKNOWN";
    eligible: boolean;
    reasons: string[];
  } | null;
  booking: {
    id: string;
    code: string;
    displayCode: string;
    qrPayload: string;
    status: string;
    slot: {
      startsAt: string;
      endsAt: string;
      branch: { name: string };
    };
  } | null;
}

export default function InvitationWizardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [loading, setLoading] = useState(true);
  const [expiredOrInvalid, setExpiredOrInvalid] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [slots, setSlots] = useState<SlotItem[]>([]);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [weightKg, setWeightKg] = useState("62");
  const [sleepHours, setSleepHours] = useState("6");
  const [hbStatus, setHbStatus] = useState<"OK" | "LOW" | "UNKNOWN">("OK");
  const [editingLastDate, setEditingLastDate] = useState(false);
  const [lastDonationDate, setLastDonationDate] = useState("");
  const [screeningSubmitting, setScreeningSubmitting] = useState(false);
  const [notEligibleResult, setNotEligibleResult] = useState<{
    reasons: string[];
    nextEligibleDate: string | null;
  } | null>(null);
  const [reminderSaved, setReminderSaved] = useState(false);

  const [selectedDayKey, setSelectedDayKey] = useState<string>("");
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedToast, setConfirmedToast] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [invRes, slotsRes] = await Promise.all([
          fetch(`/api/invitations/${token}`),
          fetch("/api/slots"),
        ]);

        const invJson = await invRes.json();
        if (!invRes.ok) {
          setExpiredOrInvalid(
            invJson?.error?.message ||
              "Tautan undangan ini sudah tidak berlaku. Hubungi UTD untuk mendapat undangan baru."
          );
          setLoading(false);
          return;
        }

        const inv: InvitationData = invJson.invitation;
        setInvitation(inv);

        if (inv.donor.lastDonationAt) {
          setLastDonationDate(inv.donor.lastDonationAt.split("T")[0]);
        }

        if (inv.booking && inv.booking.status !== "CANCELLED") {
          setStep(3);
        } else if (inv.status === "SCREENED_OK") {
          setStep(2);
        }

        const slotsJson = await slotsRes.json();
        const slotList: SlotItem[] = slotsJson.slots || [];
        setSlots(slotList);
        if (slotList.length > 0) {
          const days = Array.from(new Set(slotList.map((s) => s.dayKey))).slice(
            0,
            7
          );
          if (days.length > 0) setSelectedDayKey(days[0]);
        }
      } catch {
        setExpiredOrInvalid(
          "Koneksi terputus. Muat ulang halaman untuk membuka undangan."
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleScreeningSubmit(e: React.FormEvent) {
    e.preventDefault();
    setScreeningSubmitting(true);
    setErrorMsg(null);
    setNotEligibleResult(null);

    const parsedW = parseFloat(weightKg.replace(",", "."));
    const parsedS = parseFloat(sleepHours.replace(",", "."));

    try {
      const res = await fetch(`/api/invitations/${token}/screening`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightKg: parsedW,
          sleepHours: parsedS,
          hbStatus,
          lastDonationConfirmedAt: lastDonationDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(
          data?.error?.message || "Periksa kembali isian pemeriksaan awal."
        );
        setScreeningSubmitting(false);
        return;
      }

      if (!data.evaluation.eligible) {
        setNotEligibleResult({
          reasons: data.evaluation.reasons,
          nextEligibleDate: data.evaluation.nextEligibleDate,
        });
      } else {
        setStep(2);
      }
    } catch {
      setErrorMsg("Koneksi terputus. Perubahan belum tersimpan. Coba lagi.");
    } finally {
      setScreeningSubmitting(false);
    }
  }

  async function handleConfirmSlot() {
    if (!selectedSlotId) {
      setErrorMsg("Pilih salah satu jam kedatangan terlebih dahulu.");
      return;
    }
    setBookingSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selectedSlotId,
          token,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error?.message || "Gagal menyimpan jadwal.");
        const refreshSlots = await fetch("/api/slots").then((r) => r.json());
        if (refreshSlots.slots) setSlots(refreshSlots.slots);
        setBookingSubmitting(false);
        return;
      }

      if (invitation) {
        setInvitation({
          ...invitation,
          status: "BOOKED",
          booking: {
            id: data.booking.id,
            code: data.booking.code,
            displayCode: data.displayCode,
            qrPayload: data.qrPayload,
            status: data.booking.status,
            slot: data.booking.slot,
          },
        });
      }
      setConfirmedToast(true);
      setStep(3);
    } catch {
      setErrorMsg("Koneksi terputus. Perubahan belum tersimpan. Coba lagi.");
    } finally {
      setBookingSubmitting(false);
    }
  }

  const dayTabs = Array.from(new Set(slots.map((s) => s.dayKey))).slice(0, 7);
  const slotsForSelectedDay = slots.filter((s) => s.dayKey === selectedDayKey);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-[680px] items-center justify-between px-4">
          <Logo href="/" subtitle="Undangan donor" />
          <Link
            href="/donor"
            className="inline-flex h-10 items-center rounded-input px-3 text-sm font-bold text-brand-strong hover:bg-canvas"
          >
            Beranda donor
          </Link>
        </div>
      </header>

      <main
        id="konten-utama"
        className="mx-auto max-w-[680px] px-4 py-6 sm:py-10"
      >
        {loading && (
          <div className="space-y-4 rounded-panel border border-line bg-white p-6">
            <div className="h-6 w-48 rounded-input bg-canvas" />
            <div className="h-24 rounded-panel bg-canvas" />
            <div className="h-12 rounded-input bg-canvas" />
          </div>
        )}

        {!loading && expiredOrInvalid && (
          <div className="rounded-panel border border-line bg-white p-6">
            <div className="flex items-start gap-3">
              <Clock
                size={24}
                className="mt-0.5 shrink-0 text-ink-muted"
                aria-hidden="true"
              />
              <div>
                <h1 className="text-xl font-bold text-ink">
                  Tautan tidak berlaku
                </h1>
                <p className="mt-2 max-w-[68ch] text-base text-ink-soft">
                  {expiredOrInvalid}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/stok"
                    className="inline-flex h-11 items-center justify-center rounded-input bg-brand px-5 text-sm font-bold text-white hover:bg-brand-strong"
                  >
                    Lihat papan stok UTD
                  </Link>
                  <Link
                    href="/masuk"
                    className="inline-flex h-11 items-center justify-center rounded-input border border-field bg-white px-5 text-sm font-bold text-ink hover:bg-canvas"
                  >
                    Masuk ke akun donor
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !expiredOrInvalid && invitation && (
          <div className="space-y-6">
            <div className="rounded-panel border border-line bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-ink-muted">
                    Undangan untuk {invitation.donor.fullName}
                  </p>
                  <h1 className="mt-0.5 text-xl font-bold text-ink">
                    {invitation.campaign.branchName} membutuhkan golongan{" "}
                    {BLOOD_GROUP_META[invitation.campaign.group].display}
                  </h1>
                </div>
                <Chip tone="brand" Icon={Clock}>
                  Batas {formatDateWIB(invitation.campaign.deadlineAt)}
                </Chip>
              </div>
            </div>

            {/* Urutan 3 langkah */}
            <nav aria-label="Langkah pemesanan jadwal" className="px-1">
              <p className="text-xs font-bold text-brand-strong sm:hidden">
                Langkah {step} dari 3
              </p>
              <ol className="mt-1 hidden items-center gap-6 sm:flex">
                {[
                  { n: 1, title: "Pemeriksaan awal" },
                  { n: 2, title: "Pilih jam" },
                  { n: 3, title: "Konfirmasi" },
                ].map((item) => {
                  const isDone = step > item.n;
                  const isCurrent = step === item.n;
                  return (
                    <li key={item.n} className="flex items-center gap-2.5">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-input text-xs font-bold tabular-nums ${
                          isDone
                            ? "bg-ok-fill text-ok-ink"
                            : isCurrent
                              ? "bg-brand text-white"
                              : "border border-field bg-white text-ink-soft"
                        }`}
                      >
                        {isDone ? (
                          <Check size={14} strokeWidth={2} aria-hidden="true" />
                        ) : (
                          item.n
                        )}
                      </span>
                      <span
                        className={`text-sm ${
                          isCurrent
                            ? "font-bold text-ink"
                            : "font-medium text-ink-soft"
                        }`}
                      >
                        {item.title}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </nav>

            {errorMsg && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2.5 rounded-input border border-brand/30 bg-blush p-4 text-sm text-ink"
              >
                <TriangleAlert
                  size={18}
                  className="mt-0.5 shrink-0 text-brand-strong"
                  aria-hidden="true"
                />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Langkah 1: Pemeriksaan awal */}
            {step === 1 && !notEligibleResult && (
              <form
                onSubmit={handleScreeningSubmit}
                className="rounded-panel border border-line bg-white p-6"
              >
                <h2 className="text-[22px] font-bold text-ink">
                  Pemeriksaan awal
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Empat pertanyaan singkat. Petugas UTD tetap memeriksa
                  kesehatan Anda sebelum pengambilan darah.
                </p>

                <div className="mt-6 space-y-5">
                  <div>
                    <label
                      htmlFor="field-weight"
                      className="block text-sm font-bold text-ink"
                    >
                      Berat badan Anda saat ini
                    </label>
                    <div className="relative mt-1.5 max-w-[240px]">
                      <input
                        id="field-weight"
                        type="text"
                        inputMode="decimal"
                        required
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="h-11 w-full rounded-input border border-field bg-white pr-12 pl-3.5 text-base text-ink tabular-nums focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm font-medium text-ink-muted">
                        kg
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">
                      Batas minimum donor darah 45 kg.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="field-sleep"
                      className="block text-sm font-bold text-ink"
                    >
                      Berapa jam Anda tidur semalam?
                    </label>
                    <div className="relative mt-1.5 max-w-[240px]">
                      <input
                        id="field-sleep"
                        type="text"
                        inputMode="decimal"
                        required
                        value={sleepHours}
                        onChange={(e) => setSleepHours(e.target.value)}
                        className="h-11 w-full rounded-input border border-field bg-white pr-14 pl-3.5 text-base text-ink tabular-nums focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm font-medium text-ink-muted">
                        jam
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">
                      Disarankan tidur minimal 4 jam sebelum donor.
                    </p>
                  </div>

                  <fieldset>
                    <legend className="block text-sm font-bold text-ink">
                      Hasil hemoglobin terakhir yang Anda ketahui
                    </legend>
                    <div className="mt-2 space-y-2.5">
                      {[
                        { val: "OK", label: "12,5 g/dL atau lebih" },
                        { val: "LOW", label: "Di bawah 12,5 g/dL" },
                        { val: "UNKNOWN", label: "Saya tidak tahu" },
                      ].map((opt) => (
                        <label
                          key={opt.val}
                          className={`flex min-h-12 w-full items-center gap-3 rounded-input border px-4 py-2.5 text-base transition-colors duration-150 ${
                            hbStatus === opt.val
                              ? "border-2 border-brand bg-blush font-bold text-ink"
                              : "border-field bg-white text-ink hover:bg-canvas"
                          }`}
                        >
                          <input
                            type="radio"
                            name="hbStatus"
                            value={opt.val}
                            checked={hbStatus === opt.val}
                            onChange={() =>
                              setHbStatus(opt.val as "OK" | "LOW" | "UNKNOWN")
                            }
                            className="h-4 w-4 accent-[#C8102E]"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>

                    {hbStatus === "UNKNOWN" && (
                      <p className="mt-2 rounded-input border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink">
                        Tidak apa-apa. Petugas akan memeriksa hemoglobin Anda di
                        lokasi.
                      </p>
                    )}
                  </fieldset>

                  <div>
                    <span className="block text-sm font-bold text-ink">
                      Tanggal donor terakhir Anda
                    </span>
                    {!editingLastDate ? (
                      <div className="mt-1.5 flex items-center gap-4">
                        <span className="text-base font-medium text-ink tabular-nums">
                          {lastDonationDate
                            ? formatDateWIB(lastDonationDate)
                            : "Belum pernah donor"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingLastDate(true)}
                          className="inline-flex h-10 items-center text-sm font-bold text-brand-strong hover:underline"
                        >
                          Ubah
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1.5 flex flex-wrap items-center gap-3">
                        <input
                          type="date"
                          aria-label="Tanggal donor terakhir"
                          value={lastDonationDate}
                          onChange={(e) => setLastDonationDate(e.target.value)}
                          className="h-11 rounded-input border border-field bg-white px-3.5 text-base text-ink tabular-nums focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setEditingLastDate(false)}
                          className="inline-flex h-10 items-center text-sm font-bold text-brand-strong hover:underline"
                        >
                          Selesai
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    type="submit"
                    disabled={screeningSubmitting}
                    className="inline-flex h-12 w-full items-center justify-center rounded-input bg-brand px-6 text-base font-bold text-white transition-colors duration-150 hover:bg-brand-strong disabled:opacity-60 sm:w-auto"
                  >
                    {screeningSubmitting
                      ? "Memeriksa..."
                      : "Lanjut ke pilih jam"}
                  </button>
                </div>
              </form>
            )}

            {step === 1 && notEligibleResult && (
              <div className="rounded-panel border border-line bg-white p-6">
                <h2 className="text-[22px] font-bold text-ink">
                  Anda belum bisa donor hari ini
                </h2>
                <div className="mt-3 space-y-2 text-base text-ink-soft">
                  {notEligibleResult.reasons.map((reason, idx) => (
                    <p key={idx}>{reason}</p>
                  ))}
                </div>

                {notEligibleResult.nextEligibleDate && (
                  <div className="mt-4 rounded-input border border-warn-ink/25 bg-warn-fill p-4 text-sm text-ink">
                    Tanggal boleh donor lagi:{" "}
                    <strong className="font-bold tabular-nums">
                      {formatDateWIB(notEligibleResult.nextEligibleDate)}
                    </strong>
                  </div>
                )}

                <p className="mt-4 text-sm text-ink-muted">
                  Ini pemeriksaan awal. Petugas UTD tetap memeriksa kesehatan
                  Anda sebelum donor.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setReminderSaved(true)}
                    disabled={reminderSaved}
                    className="inline-flex h-11 items-center justify-center rounded-input bg-brand px-5 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-60"
                  >
                    {reminderSaved
                      ? "Pengingat tersimpan"
                      : "Ingatkan saya saat boleh donor"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotEligibleResult(null)}
                    className="inline-flex h-11 items-center justify-center rounded-input border border-field bg-white px-5 text-sm font-bold text-ink hover:bg-canvas"
                  >
                    Perbaiki jawaban
                  </button>
                </div>
              </div>
            )}

            {/* Langkah 2: Pemilih slot 30 menit */}
            {step === 2 && (
              <div className="rounded-panel border border-line bg-white p-6">
                <div className="rounded-input border border-ok-ink/25 bg-ok-fill px-4 py-3 text-sm text-ink">
                  <p className="font-bold">
                    Anda memenuhi syarat awal. Pilih jam untuk donor.
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Ini pemeriksaan awal. Petugas UTD tetap memeriksa kesehatan
                    Anda sebelum donor.
                  </p>
                </div>

                <h2 className="mt-5 text-[22px] font-bold text-ink">
                  Pilih jam kedatangan
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Setiap jadwal berdurasi 30 menit dengan kuota terbatas agar
                  tidak ada antrean menumpuk.
                </p>

                <div
                  role="tablist"
                  aria-label="Pilih hari"
                  className="mt-4 flex gap-1.5 overflow-x-auto rounded-input border border-line bg-canvas p-1"
                >
                  {dayTabs.map((dayKey) => {
                    const active = selectedDayKey === dayKey;
                    return (
                      <button
                        key={dayKey}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => {
                          setSelectedDayKey(dayKey);
                          setSelectedSlotId("");
                        }}
                        className={`h-10 shrink-0 rounded-[6px] px-4 text-sm transition-colors duration-150 ${
                          active
                            ? "bg-white font-bold text-ink shadow-[0_1px_2px_rgba(28,25,23,0.08)]"
                            : "font-medium text-ink-soft hover:text-ink"
                        }`}
                      >
                        {dayKey}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {slotsForSelectedDay.map((slot) => {
                    const isSelected = selectedSlotId === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={slot.isFull}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`flex min-h-[60px] flex-col items-start justify-center rounded-input border px-4 py-2.5 text-left tabular-nums transition-colors duration-150 ${
                          slot.isFull
                            ? "cursor-not-allowed border-line bg-canvas text-ink-muted"
                            : isSelected
                              ? "border-2 border-brand bg-blush text-ink"
                              : "border-field bg-white text-ink hover:bg-canvas"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="text-base font-bold">
                            {slot.timeLabel}
                          </span>
                          {isSelected && !slot.isFull && (
                            <CheckCircle2
                              size={16}
                              className="text-brand-strong"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <span
                          className={`mt-1 text-xs font-bold ${
                            slot.isFull
                              ? "text-ink-muted"
                              : isSelected
                                ? "text-brand-strong"
                                : "text-ok-ink"
                          }`}
                        >
                          {slot.isFull ? "Penuh" : `${slot.remaining} tersisa`}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={!selectedSlotId || bookingSubmitting}
                    onClick={handleConfirmSlot}
                    className="inline-flex h-12 w-full items-center justify-center rounded-input bg-brand px-6 text-base font-bold text-white transition-colors duration-150 hover:bg-brand-strong disabled:opacity-60 sm:w-auto"
                  >
                    {bookingSubmitting
                      ? "Menyimpan..."
                      : "Konfirmasi jadwal"}
                  </button>

                  {!selectedSlotId && (
                    <span className="text-xs text-ink-muted">
                      Pilih salah satu jam di atas untuk mengaktifkan tombol
                      konfirmasi.
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex h-11 items-center justify-center rounded-input px-3 text-sm font-bold text-brand-strong hover:bg-canvas"
                  >
                    Ubah pemeriksaan awal
                  </button>
                </div>
              </div>
            )}

            {/* Langkah 3: Konfirmasi & tiket QR */}
            {step === 3 && invitation.booking && (
              <div className="space-y-4">
                {confirmedToast && (
                  <div
                    role="status"
                    className="flex items-center gap-2 rounded-input border border-ok-ink/25 bg-ok-fill px-4 py-3 text-sm font-bold text-ink"
                  >
                    <CheckCircle2
                      size={18}
                      className="text-ok-ink"
                      aria-hidden="true"
                    />
                    <span>Jadwal dikonfirmasi</span>
                  </div>
                )}

                <QrTicketCard
                  bookingId={invitation.booking.id}
                  displayCode={invitation.booking.displayCode}
                  qrPayload={invitation.booking.qrPayload}
                  dayDateLabel={formatDayDateWIB(
                    invitation.booking.slot.startsAt
                  )}
                  timeLabel={formatTimeWIB(
                    invitation.booking.slot.startsAt,
                    true
                  )}
                  branchName={invitation.booking.slot.branch.name}
                  donorName={invitation.donor.fullName}
                  bloodGroupDisplay={
                    BLOOD_GROUP_META[invitation.donor.bloodGroup].display
                  }
                  status={invitation.booking.status}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
