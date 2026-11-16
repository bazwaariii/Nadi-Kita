"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Download,
  Droplet,
  Eye,
  FileCheck2,
  FileText,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { Chip } from "@/components/ui/StatusChip";

export interface AdminDonorRow {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  bloodGroup: string;
  bloodGroupDisplay: string;
  sex: string;
  ageYears: number;
  cityArea: string;
  weightKg: number;
  eligibleNow: boolean;
  daysRemaining: number;
  lastDonationFormatted: string;
  ktpFileName: string | null;
  ktpFileSize: number | null;
  ktpVerified: boolean;
  hasKtpFile: boolean;
  historicalDonations: number;
}

export function DonorVerificationClient({
  initialDonors,
}: {
  initialDonors: AdminDonorRow[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [donors, setDonors] = useState<AdminDonorRow[]>(initialDonors);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<
    "ALL" | "PENDING_KTP" | "VERIFIED_KTP" | "ELIGIBLE"
  >("ALL");
  const [bloodFilter, setBloodFilter] = useState<string>("ALL");
  const [previewDonor, setPreviewDonor] = useState<AdminDonorRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modal Tambah Pendonor Baru (Walk-In UTD)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newGroup, setNewGroup] = useState("O_POS");
  const [newSex, setNewSex] = useState<"M" | "F">("M");
  const [newBirthDate, setNewBirthDate] = useState("1999-04-12");
  const [newArea, setNewArea] = useState("Gubeng");
  const [newKtpName, setNewKtpName] = useState("");
  const [newKtpSize, setNewKtpSize] = useState(0);
  const [newKtpData, setNewKtpData] = useState("");
  const [creatingDonor, setCreatingDonor] = useState(false);

  const stats = useMemo(() => {
    const total = donors.length;
    const verified = donors.filter((d) => d.ktpVerified).length;
    const pending = total - verified;
    const eligible = donors.filter((d) => d.eligibleNow).length;
    return { total, verified, pending, eligible };
  }, [donors]);

  const filteredDonors = useMemo(() => {
    return donors.filter((d) => {
      if (filterTab === "PENDING_KTP" && d.ktpVerified) return false;
      if (filterTab === "VERIFIED_KTP" && !d.ktpVerified) return false;
      if (filterTab === "ELIGIBLE" && !d.eligibleNow) return false;
      if (bloodFilter !== "ALL" && d.bloodGroup !== bloodFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          d.fullName.toLowerCase().includes(q) ||
          d.email.toLowerCase().includes(q) ||
          d.cityArea.toLowerCase().includes(q) ||
          d.bloodGroupDisplay.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [donors, filterTab, bloodFilter, search]);

  async function handleToggleVerify(donorId: string, nextVerified: boolean) {
    setBusyId(donorId);
    try {
      const res = await fetch(`/api/admin/donors/${donorId}/verify-ktp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: nextVerified }),
      });
      if (res.ok) {
        setDonors((prev) =>
          prev.map((item) =>
            item.id === donorId ? { ...item, ktpVerified: nextVerified } : item
          )
        );
        if (previewDonor?.id === donorId) {
          setPreviewDonor((prev) =>
            prev ? { ...prev, ktpVerified: nextVerified } : null
          );
        }
        setToastMsg(
          nextVerified
            ? "Dokumen KTP pendonor berhasil diverifikasi."
            : "Status verifikasi KTP dibatalkan."
        );
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleRecordWalkInDonation(donor: AdminDonorRow) {
    setBusyId(donor.id);
    setToastMsg(null);
    try {
      const res = await fetch("/api/admin/donors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_DONATION",
          donorId: donor.id,
          volumeMl: 350,
        }),
      });
      if (res.ok) {
        setDonors((prev) =>
          prev.map((d) =>
            d.id === donor.id
              ? {
                  ...d,
                  eligibleNow: false,
                  daysRemaining: 60,
                  lastDonationFormatted: "Hari ini",
                  historicalDonations: d.historicalDonations + 1,
                }
              : d
          )
        );
        setToastMsg(
          `Donor darah ${donor.fullName} (${donor.bloodGroupDisplay}) selesai dicatat. Stok bertambah 1 kantong dan masa jeda 60 hari dimulai.`
        );
        router.refresh();
      } else {
        const err = await res.json().catch(() => null);
        setToastMsg(
          err?.error?.message || "Gagal mencatat donor selesai hari ini."
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteDonor(donor: AdminDonorRow) {
    setBusyId(donor.id);
    try {
      const res = await fetch(`/api/admin/donors?id=${donor.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDonors((prev) => prev.filter((d) => d.id !== donor.id));
        setToastMsg(`Data pendonor ${donor.fullName} telah dihapus.`);
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  function handleSelectPdf(file: File | undefined | null) {
    if (!file) return;
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setNewKtpName(file.name);
      setNewKtpSize(file.size);
      setNewKtpData(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  }

  async function handleCreateDonor(e: React.FormEvent) {
    e.preventDefault();
    setCreatingDonor(true);
    try {
      const res = await fetch("/api/admin/donors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newName,
          email: newEmail,
          phone: newPhone,
          bloodGroup: newGroup,
          sex: newSex,
          birthDate: newBirthDate,
          cityArea: newArea,
          ktpFileName: newKtpName || null,
          ktpFileSize: newKtpSize || null,
          ktpFileData: newKtpData || null,
          ktpVerified: Boolean(newKtpData),
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewName("");
        setNewEmail("");
        setNewPhone("");
        setNewKtpName("");
        setNewKtpData("");
        setToastMsg("Pendonor baru berhasil ditambahkan ke basis data.");
        window.location.reload();
      } else {
        const err = await res.json().catch(() => null);
        setToastMsg(
          err?.error?.message || "Gagal menyimpan pendonor baru."
        );
      }
    } finally {
      setCreatingDonor(false);
    }
  }

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div
          role="status"
          className="fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-input border border-line bg-white px-4 py-3 text-sm font-bold text-ink shadow-[var(--shadow-float)]"
        >
          <CheckCircle2 size={16} className="shrink-0 text-ok-ink" aria-hidden="true" />
          <span>{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            aria-label="Tutup pemberitahuan"
            className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-input text-ink-soft hover:bg-canvas hover:text-ink"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Metrik Ringkasan Verifikasi KTP & Kelayakan */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div className="rounded-panel border border-line bg-white p-4">
          <p className="text-sm text-ink-muted">Total pendonor terdaftar</p>
          <p className="mt-1 text-[26px] leading-none font-bold text-ink tabular-nums">
            {stats.total}
          </p>
          <p className="mt-1.5 text-xs text-ink-soft">Tersimpan di basis data</p>
        </div>

        <div className="rounded-panel border border-line bg-white p-4">
          <p className="text-sm text-ink-muted">KTP terverifikasi petugas</p>
          <p className="mt-1 text-[26px] leading-none font-bold text-ok-ink tabular-nums">
            {stats.verified}
          </p>
          <p className="mt-1.5 text-xs text-ink-soft">Dokumen PDF valid</p>
        </div>

        <div
          className={`rounded-panel border p-4 ${
            stats.pending > 0
              ? "border-brand/40 bg-blush/40"
              : "border-line bg-white"
          }`}
        >
          <p className="text-sm text-ink-muted">Menunggu verifikasi KTP</p>
          <p className="mt-1 text-[26px] leading-none font-bold text-warn-ink tabular-nums">
            {stats.pending}
          </p>
          <p className="mt-1.5 text-xs text-ink-soft">Perlu pemeriksaan PDF</p>
        </div>

        <div className="rounded-panel border border-line bg-white p-4">
          <p className="text-sm text-ink-muted">Siap donor hari ini</p>
          <p className="mt-1 text-[26px] leading-none font-bold text-brand-strong tabular-nums">
            {stats.eligible}
          </p>
          <p className="mt-1.5 text-xs text-ink-soft">Lolos jeda 60 hari</p>
        </div>
      </div>

      {/* Bilah Filter, Pencarian, & Tombol Tambah Pendonor */}
      <div className="rounded-panel border border-line bg-white">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex flex-wrap rounded-input border border-line bg-canvas p-1">
            {[
              { id: "ALL", label: `Semua (${stats.total})` },
              {
                id: "PENDING_KTP",
                label: `Menunggu verifikasi (${stats.pending})`,
              },
              {
                id: "VERIFIED_KTP",
                label: `Terverifikasi (${stats.verified})`,
              },
              { id: "ELIGIBLE", label: `Siap donor (${stats.eligible})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setFilterTab(
                    tab.id as
                      | "ALL"
                      | "PENDING_KTP"
                      | "VERIFIED_KTP"
                      | "ELIGIBLE"
                  )
                }
                className={`h-9 rounded-[6px] px-3 text-sm transition-colors ${
                  filterTab === tab.id
                    ? "bg-white font-bold text-ink shadow-[0_1px_2px_rgba(28,25,23,0.08)]"
                    : "font-medium text-ink-soft hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
              />
              <input
                type="search"
                aria-label="Cari pendonor"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, area, email..."
                className="h-10 w-full rounded-input border border-field bg-white pr-3 pl-9 text-sm text-ink placeholder:text-ink-muted transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
              />
            </div>

            <select
              aria-label="Filter golongan darah"
              value={bloodFilter}
              onChange={(e) => setBloodFilter(e.target.value)}
              className="h-10 rounded-input border border-field bg-white px-3 text-sm font-bold text-ink transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
            >
              <option value="ALL">Semua golongan</option>
              <option value="O_POS">O+</option>
              <option value="O_NEG">O−</option>
              <option value="A_POS">A+</option>
              <option value="A_NEG">A−</option>
              <option value="B_POS">B+</option>
              <option value="B_NEG">B−</option>
              <option value="AB_POS">AB+</option>
              <option value="AB_NEG">AB−</option>
            </select>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong"
            >
              <UserPlus size={16} aria-hidden="true" />
              <span>Tambah pendonor</span>
            </button>
          </div>
        </div>

        {/* Tabel Pendonor */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-strong bg-canvas text-left">
                <th className="h-10 px-3 text-[13px] font-bold whitespace-nowrap text-ink-soft">
                  Pendonor
                </th>
                <th className="h-10 px-3 text-[13px] font-bold whitespace-nowrap text-ink-soft">
                  Golongan
                </th>
                <th className="h-10 px-3 text-[13px] font-bold whitespace-nowrap text-ink-soft">
                  Domisili dan usia
                </th>
                <th className="h-10 px-3 text-[13px] font-bold whitespace-nowrap text-ink-soft">
                  Status masa jeda
                </th>
                <th className="h-10 px-3 text-[13px] font-bold whitespace-nowrap text-ink-soft">
                  Dokumen PDF KTP
                </th>
                <th className="h-10 px-3 text-right text-[13px] font-bold whitespace-nowrap text-ink-soft">
                  Tindakan petugas
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDonors.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-line last:border-b-0 hover:bg-canvas/70"
                >
                  <td className="px-3 py-2.5 align-middle">
                    <p className="font-bold text-ink">{d.fullName}</p>
                    <p className="text-xs text-ink-muted">
                      {d.email}
                      {d.phone ? `, ${d.phone}` : ""}
                    </p>
                  </td>

                  <td className="px-3 py-2.5 align-middle">
                    <span className="inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-input border border-brand/25 bg-blush px-2 text-xs font-bold tabular-nums text-brand-strong">
                      {d.bloodGroupDisplay}
                    </span>
                  </td>

                  <td className="px-3 py-2.5 align-middle text-xs text-ink-soft">
                    <p className="font-bold text-ink">{d.cityArea}</p>
                    <p className="tabular-nums">
                      {d.sex === "M" ? "Laki-laki" : "Perempuan"}, {d.ageYears}{" "}
                      thn, {d.historicalDonations}x donor
                    </p>
                  </td>

                  <td className="px-3 py-2.5 align-middle">
                    {d.eligibleNow ? (
                      <Chip tone="ok" Icon={UserCheck} size="sm">
                        Siap donor
                      </Chip>
                    ) : (
                      <Chip tone="warn" Icon={Clock} size="sm">
                        Jeda {d.daysRemaining} hari
                      </Chip>
                    )}
                    <p className="mt-1 text-xs text-ink-muted tabular-nums">
                      Terakhir: {d.lastDonationFormatted}
                    </p>
                  </td>

                  <td className="px-3 py-2.5 align-middle">
                    <div className="flex flex-col items-start gap-1">
                      {d.ktpVerified ? (
                        <Chip tone="ok" Icon={CheckCircle2} size="sm">
                          Terverifikasi
                        </Chip>
                      ) : (
                        <Chip tone="warn" Icon={Clock} size="sm">
                          Menunggu verifikasi
                        </Chip>
                      )}

                      {d.hasKtpFile ? (
                        <button
                          type="button"
                          onClick={() => setPreviewDonor(d)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-brand-strong hover:underline"
                        >
                          <FileText size={12} aria-hidden="true" />
                          <span>{d.ktpFileName || "Lihat KTP.pdf"}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-ink-muted">
                          Belum unggah PDF
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-2.5 text-right align-middle">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {d.hasKtpFile && (
                        <button
                          type="button"
                          onClick={() => setPreviewDonor(d)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-input border border-field bg-white px-2.5 text-xs font-bold text-ink transition-colors duration-150 hover:bg-canvas"
                        >
                          <Eye size={13} aria-hidden="true" />
                          <span>Lihat PDF</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={busyId === d.id}
                        onClick={() =>
                          handleToggleVerify(d.id, !d.ktpVerified)
                        }
                        className={`inline-flex h-9 items-center gap-1.5 rounded-input px-3 text-xs font-bold transition-colors duration-150 disabled:opacity-60 ${
                          d.ktpVerified
                            ? "border border-field bg-white text-ink-soft hover:bg-canvas hover:text-ink"
                            : "bg-brand text-white hover:bg-brand-strong"
                        }`}
                      >
                        <FileCheck2 size={13} aria-hidden="true" />
                        <span>
                          {d.ktpVerified ? "Batal verifikasi" : "Verifikasi KTP"}
                        </span>
                      </button>

                      {d.eligibleNow && (
                        <button
                          type="button"
                          disabled={busyId === d.id}
                          onClick={() => handleRecordWalkInDonation(d)}
                          title="Catat donor selesai hari ini (+1 kantong stok dan mulai masa jeda 60 hari)"
                          className="inline-flex h-9 items-center gap-1.5 rounded-input bg-brand px-3 text-xs font-bold text-white transition-colors duration-150 hover:bg-brand-strong disabled:opacity-60"
                        >
                          <Droplet size={12} aria-hidden="true" />
                          <span>Catat donor</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={busyId === d.id}
                        onClick={() => handleDeleteDonor(d)}
                        aria-label={`Hapus data pendonor ${d.fullName}`}
                        title="Hapus data pendonor"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-input border border-line bg-white text-danger-ink transition-colors duration-150 hover:border-danger-ink hover:bg-danger-fill disabled:opacity-60"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredDonors.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-10 text-center text-sm text-ink-muted"
                  >
                    Tidak ada pendonor yang cocok dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Pendonor Baru (Walk-In UTD) */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tambah pendonor baru"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
        >
          <div className="w-full max-w-[560px] rounded-panel bg-white shadow-[var(--shadow-float)]">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-brand-strong" aria-hidden="true" />
                <h2 className="text-lg font-bold text-ink">
                  Registrasi pendonor baru
                </h2>
              </div>
              <button
                type="button"
                aria-label="Tutup modal registrasi pendonor"
                onClick={() => setShowAddModal(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-input text-ink-soft hover:bg-canvas hover:text-ink"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreateDonor} className="space-y-4 p-5">
              <div>
                <label
                  htmlFor="add-name"
                  className="block text-sm font-bold text-ink"
                >
                  Nama lengkap sesuai KTP
                </label>
                <input
                  id="add-name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base text-ink placeholder:text-ink-muted transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="add-email"
                    className="block text-sm font-bold text-ink"
                  >
                    Email pendonor
                  </label>
                  <input
                    id="add-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="opsional@email.com"
                    className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base text-ink placeholder:text-ink-muted transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="add-phone"
                    className="block text-sm font-bold text-ink"
                  >
                    Nomor WhatsApp
                  </label>
                  <input
                    id="add-phone"
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="0812..."
                    className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base text-ink placeholder:text-ink-muted transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="add-group"
                    className="block text-sm font-bold text-ink"
                  >
                    Golongan darah
                  </label>
                  <select
                    id="add-group"
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base font-bold text-ink transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                  >
                    <option value="O_POS">O+</option>
                    <option value="O_NEG">O−</option>
                    <option value="A_POS">A+</option>
                    <option value="A_NEG">A−</option>
                    <option value="B_POS">B+</option>
                    <option value="B_NEG">B−</option>
                    <option value="AB_POS">AB+</option>
                    <option value="AB_NEG">AB−</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="add-sex"
                    className="block text-sm font-bold text-ink"
                  >
                    Jenis kelamin
                  </label>
                  <select
                    id="add-sex"
                    value={newSex}
                    onChange={(e) => setNewSex(e.target.value as "M" | "F")}
                    className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base text-ink transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                  >
                    <option value="M">Laki-laki</option>
                    <option value="F">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="add-birth"
                    className="block text-sm font-bold text-ink"
                  >
                    Tanggal lahir
                  </label>
                  <input
                    id="add-birth"
                    type="date"
                    required
                    value={newBirthDate}
                    onChange={(e) => setNewBirthDate(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-sm text-ink transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="add-area"
                    className="block text-sm font-bold text-ink"
                  >
                    Kecamatan atau domisili
                  </label>
                  <input
                    id="add-area"
                    type="text"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base text-ink transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="add-ktp-pdf"
                    className="block text-sm font-bold text-ink"
                  >
                    Dokumen PDF KTP
                  </label>
                  <input
                    id="add-ktp-pdf"
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => handleSelectPdf(e.target.files?.[0])}
                    className="sr-only"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-input border border-dashed border-field bg-canvas px-3 text-sm font-bold text-ink transition-colors hover:bg-blush/40"
                  >
                    <UploadCloud size={16} aria-hidden="true" />
                    <span className="truncate">
                      {newKtpName || "Pilih file .PDF"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-input border border-field bg-white px-4 text-sm font-bold text-ink transition-colors duration-150 hover:bg-canvas"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingDonor}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong disabled:opacity-60"
                >
                  {creatingDonor ? "Menyimpan..." : "Simpan pendonor baru"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pratinjau & Verifikasi Dokumen PDF KTP */}
      {previewDonor && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau KTP ${previewDonor.fullName}`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
        >
          <div className="flex max-h-[90vh] w-full max-w-[720px] flex-col overflow-hidden rounded-panel bg-white shadow-[var(--shadow-float)]">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={20} className="text-brand-strong" aria-hidden="true" />
                <div>
                  <h2 className="text-lg font-bold text-ink">
                    Pemeriksaan dokumen KTP pendonor
                  </h2>
                  <p className="text-xs text-ink-soft">
                    {previewDonor.fullName}, golongan{" "}
                    {previewDonor.bloodGroupDisplay}, {previewDonor.ageYears}{" "}
                    tahun
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewDonor(null)}
                aria-label="Tutup modal pratinjau"
                className="inline-flex h-10 w-10 items-center justify-center rounded-input text-ink-soft hover:bg-canvas hover:text-ink"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-3 rounded-input border border-line bg-canvas p-3.5 text-xs sm:grid-cols-4">
                <div>
                  <span className="text-ink-muted">Nama lengkap</span>
                  <p className="mt-0.5 font-bold text-ink">
                    {previewDonor.fullName}
                  </p>
                </div>
                <div>
                  <span className="text-ink-muted">Golongan darah</span>
                  <p className="mt-0.5 font-bold tabular-nums text-brand-strong">
                    {previewDonor.bloodGroupDisplay}
                  </p>
                </div>
                <div>
                  <span className="text-ink-muted">Usia dan riwayat</span>
                  <p className="mt-0.5 font-bold tabular-nums text-ink">
                    {previewDonor.ageYears} thn,{" "}
                    {previewDonor.historicalDonations}x donor
                  </p>
                </div>
                <div>
                  <span className="text-ink-muted">Status verifikasi</span>
                  <p className="mt-0.5 font-bold text-ink">
                    {previewDonor.ktpVerified
                      ? "Terverifikasi petugas"
                      : "Menunggu verifikasi"}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-input border border-line bg-canvas">
                <iframe
                  src={`/api/admin/donors/${previewDonor.id}/ktp`}
                  title={`Dokumen PDF KTP ${previewDonor.fullName}`}
                  className="h-[340px] w-full bg-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-4">
              <a
                href={`/api/admin/donors/${previewDonor.id}/ktp`}
                download={previewDonor.ktpFileName || "KTP_Pendonor.pdf"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-input border border-field bg-white px-4 text-sm font-bold text-ink transition-colors duration-150 hover:bg-canvas"
              >
                <Download size={15} aria-hidden="true" />
                <span>Unduh PDF</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewDonor(null)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-input border border-field bg-white px-4 text-sm font-bold text-ink transition-colors duration-150 hover:bg-canvas"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={busyId === previewDonor.id}
                  onClick={() =>
                    handleToggleVerify(
                      previewDonor.id,
                      !previewDonor.ktpVerified
                    )
                  }
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-input px-4 text-sm font-bold transition-colors duration-150 disabled:opacity-60 ${
                    previewDonor.ktpVerified
                      ? "border border-field bg-white text-ink-soft hover:bg-canvas hover:text-ink"
                      : "bg-brand text-white hover:bg-brand-strong"
                  }`}
                >
                  <CheckCircle2 size={15} aria-hidden="true" />
                  <span>
                    {previewDonor.ktpVerified
                      ? "Batalkan verifikasi"
                      : "Setujui dan verifikasi KTP"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
