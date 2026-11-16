"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  FileText,
  Trash2,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";
import {
  BLOOD_GROUP_META,
  BLOOD_GROUP_ORDER,
} from "@/lib/format-tanggal";
import { PublicHeader } from "@/components/ui/Navigation";

const SURABAYA_AREAS = [
  "Gubeng",
  "Wonokromo",
  "Sukolilo",
  "Rungkut",
  "Tegalsari",
  "Sawahan",
  "Genteng",
  "Mulyorejo",
];

const inputClass =
  "mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base text-ink placeholder:text-ink-muted transition-colors duration-150 focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none";

function buildSamplePdfDataUri(name: string): {
  fileName: string;
  fileSize: number;
  dataUri: string;
} {
  const cleanName = (name || "Calon Pendonor").replace(/[()\\]/g, "");
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 420 260] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 210 >>
stream
BT
/F1 13 Tf
28 215 Td
(DOKUMEN KTP PENDONOR - NADI KITA UTD) Tj
/F1 10 Tf
0 -28 Td
(Nama Lengkap : ${cleanName}) Tj
0 -18 Td
(Domisili : Kota Surabaya - Jawa Timur) Tj
0 -18 Td
(Status Dokumen : Siap Diverifikasi Admin UTD) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000229 00000 n 
0000000297 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
558
%%EOF`;
  const base64 =
    typeof window !== "undefined"
      ? window.btoa(pdfContent)
      : Buffer.from(pdfContent).toString("base64");
  const slug =
    cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "pendonor";
  return {
    fileName: `KTP_${slug}.pdf`,
    fileSize: pdfContent.length,
    dataUri: `data:application/pdf;base64,${base64}`,
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("2001-05-14");
  const [sex, setSex] = useState<"M" | "F">("M");
  const [bloodGroup, setBloodGroup] = useState("O_POS");
  const [cityArea, setCityArea] = useState("Gubeng");
  const [weightKg, setWeightKg] = useState(62);
  const [contactConsent, setContactConsent] = useState(false);

  const [ktpFileName, setKtpFileName] = useState<string>("");
  const [ktpFileSize, setKtpFileSize] = useState<number>(0);
  const [ktpFileData, setKtpFileData] = useState<string>("");
  const [showPdfPreview, setShowPdfPreview] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function processSelectedFile(file: File | undefined | null) {
    setErrorMsg(null);
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setErrorMsg(
        "Format dokumen tidak sesuai. Unggah file KTP dalam format PDF."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Ukuran file PDF KTP maksimal 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setKtpFileName(file.name);
      setKtpFileSize(file.size);
      setKtpFileData(result);
    };
    reader.onerror = () => {
      setErrorMsg("Gagal membaca file PDF. Silakan pilih ulang file Anda.");
    };
    reader.readAsDataURL(file);
  }

  function handleUseSamplePdf() {
    setErrorMsg(null);
    const sample = buildSamplePdfDataUri(fullName || "Pendonor Baru");
    setKtpFileName(sample.fileName);
    setKtpFileSize(sample.fileSize);
    setKtpFileData(sample.dataUri);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!ktpFileData || !ktpFileName) {
      setErrorMsg(
        "Unggah dokumen KTP berformat PDF sebelum menyelesaikan pendaftaran."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          password,
          birthDate,
          sex,
          bloodGroup,
          cityArea,
          weightKg,
          contactConsent,
          ktpFileName,
          ktpFileSize,
          ktpFileData,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error?.message || "Pendaftaran belum berhasil.");
        setLoading(false);
        return;
      }
      router.push("/donor");
      router.refresh();
    } catch {
      setErrorMsg("Koneksi terputus. Perubahan belum tersimpan. Coba lagi.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <PublicHeader />

      <main
        id="konten-utama"
        className="mx-auto max-w-[680px] px-4 py-8 sm:py-12"
      >
        <div className="rounded-panel border border-line bg-white p-5 sm:p-8">
          <h1 className="text-[30px] leading-tight font-bold text-ink sm:text-[34px]">
            Daftar sebagai pendonor
          </h1>
          <p className="mt-2 max-w-[62ch] text-base text-ink-soft">
            Data Anda dipakai oleh UTD PMI Kota Surabaya untuk memantau masa
            jeda 60 hari, memverifikasi KTP, dan mengirim undangan saat stok
            golongan darah Anda menipis.
          </p>

          {errorMsg && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-3 rounded-input border border-brand/30 bg-blush px-4 py-3 text-sm text-ink"
            >
              <TriangleAlert
                size={18}
                className="mt-0.5 shrink-0 text-brand-strong"
                aria-hidden="true"
              />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Bagian 1: Identitas diri */}
            <fieldset className="space-y-4">
              <legend className="text-lg font-bold text-ink">
                Identitas & kontak
              </legend>

              <div>
                <label
                  htmlFor="reg-name"
                  className="block text-sm font-bold text-ink"
                >
                  Nama lengkap sesuai KTP
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  placeholder="Contoh: Nadia Kusuma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-sm font-bold text-ink"
                  >
                    Alamat email
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-phone"
                    className="block text-sm font-bold text-ink"
                  >
                    Nomor WhatsApp (opsional)
                  </label>
                  <input
                    id="reg-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0899-0000-0001"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-area"
                  className="block text-sm font-bold text-ink"
                >
                  Kecamatan domisili
                </label>
                <select
                  id="reg-area"
                  value={cityArea}
                  onChange={(e) => setCityArea(e.target.value)}
                  className={inputClass}
                >
                  {SURABAYA_AREAS.map((area) => (
                    <option key={area} value={area}>
                      {area}, Surabaya
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>

            {/* Bagian 2: Data medis dasar */}
            <fieldset className="space-y-4 border-t border-line pt-6">
              <legend className="text-lg font-bold text-ink">
                Data donor dasar
              </legend>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="reg-group"
                    className="block text-sm font-bold text-ink"
                  >
                    Golongan darah
                  </label>
                  <select
                    id="reg-group"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className={inputClass}
                  >
                    {BLOOD_GROUP_ORDER.map((code) => (
                      <option key={code} value={code}>
                        {BLOOD_GROUP_META[code].display} (
                        {BLOOD_GROUP_META[code].spoken})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="reg-birth"
                    className="block text-sm font-bold text-ink"
                  >
                    Tanggal lahir
                  </label>
                  <input
                    id="reg-birth"
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className={`${inputClass} tabular-nums`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-weight"
                    className="block text-sm font-bold text-ink"
                  >
                    Berat badan (kg)
                  </label>
                  <input
                    id="reg-weight"
                    type="number"
                    min={45}
                    max={200}
                    required
                    value={weightKg}
                    onChange={(e) =>
                      setWeightKg(Math.max(45, Number(e.target.value) || 45))
                    }
                    className={`${inputClass} tabular-nums`}
                  />
                  <p className="mt-1 text-xs text-ink-muted">Minimal 45 kg</p>
                </div>
              </div>

              <div>
                <span className="block text-sm font-bold text-ink">
                  Jenis kelamin
                </span>
                <div className="mt-1.5 grid grid-cols-2 gap-3">
                  {[
                    { val: "M", label: "Laki-laki" },
                    { val: "F", label: "Perempuan" },
                  ].map((opt) => (
                    <label
                      key={opt.val}
                      className={`flex h-11 items-center gap-2.5 rounded-input border px-3.5 text-sm transition-colors duration-150 ${
                        sex === opt.val
                          ? "border-2 border-brand bg-blush font-bold text-ink"
                          : "border-field bg-white font-medium text-ink hover:bg-canvas"
                      }`}
                    >
                      <input
                        type="radio"
                        name="sex"
                        value={opt.val}
                        checked={sex === opt.val}
                        onChange={() => setSex(opt.val as "M" | "F")}
                        className="h-4 w-4 accent-[#C8102E]"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>

            {/* Bagian 3: Dokumen PDF KTP (wajib) */}
            <div className="space-y-3 border-t border-line pt-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <label
                    htmlFor="reg-ktp-pdf"
                    className="block text-lg font-bold text-ink"
                  >
                    Dokumen KTP (format PDF)
                  </label>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    Wajib diunggah untuk verifikasi identitas dan batas usia 17
                    sampai 60 tahun oleh petugas UTD. Ukuran maksimal 5 MB.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleUseSamplePdf}
                  className="inline-flex h-10 items-center justify-center rounded-input border border-field bg-white px-3 text-sm font-bold text-ink transition-colors duration-150 hover:bg-canvas"
                >
                  Gunakan contoh PDF KTP
                </button>
              </div>

              <input
                ref={fileInputRef}
                id="reg-ktp-pdf"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => processSelectedFile(e.target.files?.[0])}
                className="sr-only"
              />

              {!ktpFileData ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    processSelectedFile(e.dataTransfer.files?.[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`flex flex-col items-center justify-center rounded-panel border-2 border-dashed px-4 py-7 text-center transition-colors duration-150 ${
                    dragActive
                      ? "border-brand bg-blush/50"
                      : "border-field bg-canvas hover:border-brand"
                  }`}
                >
                  <UploadCloud
                    size={24}
                    className="text-brand-strong"
                    aria-hidden="true"
                  />
                  <p className="mt-2 text-base font-bold text-ink">
                    Pilih file PDF KTP atau tarik file ke kotak ini
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Hanya file .pdf, maksimal 5 MB
                  </p>
                </div>
              ) : (
                <div className="rounded-panel border border-line bg-canvas p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-input bg-ok-fill text-ok-ink">
                        <FileText size={20} aria-hidden="true" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-ink">
                            {ktpFileName}
                          </p>
                          <CheckCircle2
                            size={15}
                            className="text-ok-ink"
                            aria-hidden="true"
                          />
                        </div>
                        <p className="text-xs text-ink-muted tabular-nums">
                          PDF, {Math.max(1, Math.round(ktpFileSize / 1024))} KB,
                          siap diunggah
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPdfPreview((v) => !v)}
                        className="inline-flex h-10 items-center gap-1.5 rounded-input border border-field bg-white px-3 text-sm font-bold text-ink hover:bg-canvas"
                      >
                        <Eye size={15} aria-hidden="true" />
                        <span>
                          {showPdfPreview ? "Tutup pratinjau" : "Lihat PDF"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex h-10 items-center rounded-input border border-line bg-white px-3 text-sm font-medium text-ink-soft hover:text-ink"
                      >
                        Ganti file
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setKtpFileName("");
                          setKtpFileSize(0);
                          setKtpFileData("");
                          setShowPdfPreview(false);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        aria-label="Hapus file PDF KTP"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-input border border-line bg-white text-danger-ink hover:border-danger-ink hover:bg-danger-fill"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {showPdfPreview && (
                    <div className="mt-3 overflow-hidden rounded-input border border-line bg-white">
                      <iframe
                        src={ktpFileData}
                        title="Pratinjau dokumen PDF KTP"
                        className="h-60 w-full"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bagian 4: Kata sandi & persetujuan */}
            <div className="space-y-4 border-t border-line pt-6">
              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-sm font-bold text-ink"
                >
                  Kata sandi akun
                </label>
                <input
                  id="reg-password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>

              <label className="flex items-start gap-3 rounded-input border border-line bg-canvas p-4 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={contactConsent}
                  onChange={(e) => setContactConsent(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#C8102E]"
                />
                <span>
                  Saya setuju dihubungi oleh UTD terkait permintaan donor dan
                  menyatakan dokumen KTP PDF yang diunggah adalah benar. Data
                  saya dipakai hanya untuk keperluan transfusi darah.
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center rounded-input bg-brand px-5 text-base font-bold text-white transition-colors duration-150 hover:bg-brand-strong disabled:opacity-60"
              >
                {loading
                  ? "Menyimpan data & dokumen KTP..."
                  : "Simpan pendaftaran & masuk"}
              </button>
            </div>
          </form>

          <p className="mt-6 border-t border-line pt-5 text-base text-ink-soft">
            Sudah punya akun pendonor atau koordinator?{" "}
            <Link
              href="/masuk"
              className="inline-flex min-h-11 items-center font-bold text-brand-strong underline-offset-4 hover:underline"
            >
              Masuk di sini
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
