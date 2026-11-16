"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  LogOut,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";
import { Chip } from "@/components/ui/StatusChip";

interface DonorProfileFormProps {
  donor: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    bloodGroup: string;
    birthDate: string;
    lastDonationAt: string;
    cityArea: string;
    weightKg: number;
    contactConsent: boolean;
    ktpFileName: string | null;
    ktpFileSize: number | null;
    ktpVerified: boolean;
    hasKtpFile: boolean;
  };
  bloodGroupOptions: { code: string; label: string }[];
}

const inputClass =
  "mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base text-ink placeholder:text-ink-muted transition-colors duration-150 focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none";

export function DonorProfileForm({
  donor,
  bloodGroupOptions,
}: DonorProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState(donor.fullName);
  const [phone, setPhone] = useState(donor.phone);
  const [bloodGroup, setBloodGroup] = useState(donor.bloodGroup);
  const [birthDate, setBirthDate] = useState(donor.birthDate);
  const [lastDonationAt, setLastDonationAt] = useState(donor.lastDonationAt);
  const [cityArea, setCityArea] = useState(donor.cityArea);
  const [weightKg, setWeightKg] = useState(donor.weightKg);
  const [contactConsent, setContactConsent] = useState(donor.contactConsent);

  const [newKtpFileName, setNewKtpFileName] = useState<string>("");
  const [newKtpFileSize, setNewKtpFileSize] = useState<number>(0);
  const [newKtpFileData, setNewKtpFileData] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleSelectPdf(file: File | undefined | null) {
    setErrorMsg(null);
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setErrorMsg("Dokumen KTP harus berformat PDF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Ukuran file PDF KTP maksimal 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNewKtpFileName(file.name);
      setNewKtpFileSize(file.size);
      setNewKtpFileData(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedToast(false);
    setErrorMsg(null);

    try {
      const payload: Record<string, unknown> = {
        donorId: donor.id,
        fullName,
        phone,
        bloodGroup,
        birthDate,
        lastDonationAt: lastDonationAt || null,
        cityArea,
        weightKg,
        contactConsent,
      };

      if (newKtpFileData && newKtpFileName) {
        payload.ktpFileName = newKtpFileName;
        payload.ktpFileSize = newKtpFileSize;
        payload.ktpFileData = newKtpFileData;
      }

      const res = await fetch("/api/donor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error?.message || "Gagal menyimpan profil.");
        setSaving(false);
        return;
      }
      setNewKtpFileData("");
      setNewKtpFileName("");
      setSavedToast(true);
      router.refresh();
    } catch {
      setErrorMsg("Koneksi terputus. Perubahan belum tersimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/masuk");
      router.refresh();
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {savedToast && (
        <div
          role="status"
          className="fixed right-4 bottom-20 z-50 flex items-center gap-2 rounded-input border border-line bg-white px-4 py-3 text-sm font-bold text-ink shadow-[var(--shadow-float)] md:bottom-4"
        >
          <CheckCircle2
            size={18}
            className="shrink-0 text-ok-ink"
            aria-hidden="true"
          />
          <span>Perubahan profil disimpan</span>
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="space-y-5 rounded-panel border border-line bg-white p-5 sm:p-6"
      >
        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-input border border-brand/30 bg-blush p-3.5 text-sm text-ink"
          >
            <TriangleAlert
              size={18}
              className="mt-0.5 shrink-0 text-brand-strong"
              aria-hidden="true"
            />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Status dokumen KTP PDF */}
        <div className="rounded-panel border border-line bg-canvas p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-input border border-line bg-white text-brand-strong">
                <FileText size={20} aria-hidden="true" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-ink">
                    Dokumen KTP pendonor (PDF)
                  </h2>
                  {donor.ktpVerified ? (
                    <Chip tone="ok" Icon={CheckCircle2} size="sm">
                      Terverifikasi petugas UTD
                    </Chip>
                  ) : (
                    <Chip tone="warn" Icon={Clock} size="sm">
                      Menunggu verifikasi petugas
                    </Chip>
                  )}
                </div>

                <p className="mt-1 text-xs text-ink-muted tabular-nums">
                  {newKtpFileName
                    ? `File baru dipilih: ${newKtpFileName} (${Math.max(1, Math.round(newKtpFileSize / 1024))} KB)`
                    : donor.ktpFileName
                      ? `${donor.ktpFileName}${
                          donor.ktpFileSize
                            ? `, ${Math.max(1, Math.round(donor.ktpFileSize / 1024))} KB`
                            : ""
                        }`
                      : "Belum ada file PDF KTP"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {donor.hasKtpFile && (
                <a
                  href={`/api/admin/donors/${donor.id}/ktp`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-1.5 rounded-input border border-field bg-white px-3 text-sm font-bold text-ink hover:bg-canvas"
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  <span>Lihat PDF KTP</span>
                </a>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => handleSelectPdf(e.target.files?.[0])}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-10 items-center gap-1.5 rounded-input border border-field bg-white px-3 text-sm font-bold text-brand-strong hover:bg-canvas"
              >
                <UploadCloud size={15} aria-hidden="true" />
                <span>Ganti PDF KTP</span>
              </button>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="prof-name"
            className="block text-sm font-bold text-ink"
          >
            Nama lengkap sesuai KTP
          </label>
          <input
            id="prof-name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="prof-group"
              className="block text-sm font-bold text-ink"
            >
              Golongan darah
            </label>
            <select
              id="prof-group"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className={inputClass}
            >
              {bloodGroupOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="prof-phone"
              className="block text-sm font-bold text-ink"
            >
              Nomor telepon atau WhatsApp
            </label>
            <input
              id="prof-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="prof-birth"
              className="block text-sm font-bold text-ink"
            >
              Tanggal lahir
            </label>
            <input
              id="prof-birth"
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className={`${inputClass} tabular-nums`}
            />
          </div>

          <div>
            <label
              htmlFor="prof-last-donation"
              className="block text-sm font-bold text-ink"
            >
              Tanggal donor terakhir
            </label>
            <input
              id="prof-last-donation"
              type="date"
              value={lastDonationAt}
              onChange={(e) => setLastDonationAt(e.target.value)}
              className={`${inputClass} tabular-nums`}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="prof-area"
              className="block text-sm font-bold text-ink"
            >
              Kecamatan domisili
            </label>
            <input
              id="prof-area"
              type="text"
              value={cityArea}
              onChange={(e) => setCityArea(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="prof-weight"
              className="block text-sm font-bold text-ink"
            >
              Berat badan (kg)
            </label>
            <input
              id="prof-weight"
              type="number"
              min={45}
              max={200}
              value={weightKg}
              onChange={(e) =>
                setWeightKg(Math.max(45, Number(e.target.value) || 45))
              }
              className={`${inputClass} tabular-nums`}
            />
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-input border border-line bg-canvas p-4 text-sm text-ink">
          <input
            type="checkbox"
            checked={contactConsent}
            onChange={(e) => setContactConsent(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#C8102E]"
          />
          <span>
            Saya setuju dihubungi oleh UTD terkait permintaan donor. Data saya
            dipakai hanya untuk keperluan pelayanan transfusi darah.
          </span>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-input bg-brand px-5 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan perubahan"}
          </button>
        </div>
      </form>

      {/* Panel keluar akun */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-line bg-white p-5">
        <div>
          <p className="text-sm font-bold text-ink">Sesi akun pendonor</p>
          <p className="mt-0.5 text-sm text-ink-muted">
            Keluar dari perangkat ini atau beralih ke akun petugas UTD.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="inline-flex h-10 items-center gap-2 rounded-input border border-line bg-white px-4 text-sm font-bold text-danger-ink transition-colors duration-150 hover:border-danger-ink hover:bg-danger-fill"
        >
          <LogOut size={15} aria-hidden="true" />
          <span>{loggingOut ? "Keluar..." : "Keluar dari akun"}</span>
        </button>
      </div>
    </div>
  );
}
