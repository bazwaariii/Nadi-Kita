"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  ShieldCheck,
  TriangleAlert,
  UserPlus,
  X,
} from "lucide-react";
import { Chip } from "@/components/ui/StatusChip";

interface StaffAccount {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function SettingsClient({
  initialBranch,
  initialAdmins,
}: {
  initialBranch: {
    name: string;
    city: string;
    cooldownDays: number;
    minWeightKg: number;
    minAge: number;
    maxAge: number;
    defaultSlotCapacity: number;
  };
  initialAdmins: StaffAccount[];
}) {
  const router = useRouter();
  const [branchName, setBranchName] = useState(initialBranch.name);
  const [city, setCity] = useState(initialBranch.city);
  const [cooldownDays, setCooldownDays] = useState(initialBranch.cooldownDays);
  const [minWeightKg, setMinWeightKg] = useState(initialBranch.minWeightKg);
  const [minAge, setMinAge] = useState(initialBranch.minAge);
  const [maxAge, setMaxAge] = useState(initialBranch.maxAge);
  const [defaultSlotCapacity, setDefaultSlotCapacity] = useState(
    initialBranch.defaultSlotCapacity
  );

  const [admins, setAdmins] = useState<StaffAccount[]>(initialAdmins);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffRole, setStaffRole] = useState<"COORDINATOR" | "ADMIN">(
    "COORDINATOR"
  );

  const [savingBranch, setSavingBranch] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSaveBranch(e: React.FormEvent) {
    e.preventDefault();
    setSavingBranch(true);
    setToastMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchName,
          city,
          cooldownDays,
          minWeightKg,
          minAge,
          maxAge,
          defaultSlotCapacity,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setErrorMsg(d?.error?.message || "Gagal menyimpan pengaturan UTD.");
      } else {
        setToastMsg("Konfigurasi cabang UTD berhasil disimpan.");
        router.refresh();
      }
    } finally {
      setSavingBranch(false);
    }
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    setSavingStaff(true);
    setToastMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: staffName,
          email: staffEmail,
          password: staffPassword,
          role: staffRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error?.message || "Gagal menambahkan akun petugas.");
      } else {
        setAdmins((prev) => [...prev, data.admin]);
        setStaffName("");
        setStaffEmail("");
        setStaffPassword("");
        setToastMsg(
          `Akun petugas ${data.admin.email} berhasil dibuat dan dapat digunakan untuk masuk.`
        );
        router.refresh();
      }
    } finally {
      setSavingStaff(false);
    }
  }

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div
          role="status"
          className="fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-input border border-line bg-white px-4 py-3 text-sm font-bold text-ink shadow-[var(--shadow-float)]"
        >
          <CheckCircle2
            size={16}
            className="shrink-0 text-ok-ink"
            aria-hidden="true"
          />
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

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-input border border-brand/30 bg-blush px-4 py-3 text-sm text-ink"
        >
          <TriangleAlert
            size={18}
            className="mt-0.5 shrink-0 text-brand-strong"
            aria-hidden="true"
          />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Form Konfigurasi UTD & Parameter Medis */}
        <form
          onSubmit={handleSaveBranch}
          className="rounded-panel border border-line bg-white lg:col-span-7"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Building2
                size={18}
                className="text-brand-strong"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-[17px] font-bold text-ink">
                  Identitas cabang UTD dan aturan medis
                </h2>
                <p className="text-sm text-ink-muted">
                  Parameter ini diterapkan langsung pada penyaringan masa jeda
                  dan pemesanan slot.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="cfg-branch-name"
                  className="block text-sm font-bold text-ink"
                >
                  Nama Unit Transfusi Darah (UTD)
                </label>
                <input
                  id="cfg-branch-name"
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base text-ink placeholder:text-ink-muted transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="cfg-city"
                  className="block text-sm font-bold text-ink"
                >
                  Kota atau wilayah
                </label>
                <input
                  id="cfg-city"
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base text-ink placeholder:text-ink-muted transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="cfg-cooldown"
                  className="block text-sm font-bold text-ink"
                >
                  Masa jeda (hari)
                </label>
                <input
                  id="cfg-cooldown"
                  type="number"
                  min={30}
                  max={120}
                  value={cooldownDays}
                  onChange={(e) =>
                    setCooldownDays(Number(e.target.value) || 60)
                  }
                  className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base font-bold text-ink tabular-nums transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="cfg-weight"
                  className="block text-sm font-bold text-ink"
                >
                  Berat minimum (kg)
                </label>
                <input
                  id="cfg-weight"
                  type="number"
                  min={40}
                  max={70}
                  value={minWeightKg}
                  onChange={(e) => setMinWeightKg(Number(e.target.value) || 45)}
                  className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base font-bold text-ink tabular-nums transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="cfg-cap"
                  className="block text-sm font-bold text-ink"
                >
                  Kursi per slot 30 menit
                </label>
                <input
                  id="cfg-cap"
                  type="number"
                  min={1}
                  max={20}
                  value={defaultSlotCapacity}
                  onChange={(e) =>
                    setDefaultSlotCapacity(Number(e.target.value) || 4)
                  }
                  className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base font-bold text-ink tabular-nums transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="cfg-min-age"
                  className="block text-sm font-bold text-ink"
                >
                  Usia minimum (tahun)
                </label>
                <input
                  id="cfg-min-age"
                  type="number"
                  min={17}
                  max={30}
                  value={minAge}
                  onChange={(e) => setMinAge(Number(e.target.value) || 17)}
                  className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base font-bold text-ink tabular-nums transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="cfg-max-age"
                  className="block text-sm font-bold text-ink"
                >
                  Usia maksimum (tahun)
                </label>
                <input
                  id="cfg-max-age"
                  type="number"
                  min={45}
                  max={70}
                  value={maxAge}
                  onChange={(e) => setMaxAge(Number(e.target.value) || 60)}
                  className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base font-bold text-ink tabular-nums transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <button
                type="submit"
                disabled={savingBranch}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong disabled:opacity-60"
              >
                {savingBranch ? "Menyimpan..." : "Simpan konfigurasi UTD"}
              </button>
            </div>
          </div>
        </form>

        {/* Manajemen Akun Admin & Koordinator UTD */}
        <div className="rounded-panel border border-line bg-white lg:col-span-5">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck
                size={18}
                className="text-brand-strong"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-[17px] font-bold text-ink">
                  Akun petugas admin dan koordinator
                </h2>
                <p className="text-sm text-ink-muted">
                  Daftar akun resmi yang dapat masuk ke ruang kendali UTD.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="overflow-x-auto rounded-panel border border-line bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line-strong bg-canvas text-left">
                    <th className="h-10 px-3 text-[13px] font-bold whitespace-nowrap text-ink-soft">
                      Petugas
                    </th>
                    <th className="h-10 px-3 text-right text-[13px] font-bold whitespace-nowrap text-ink-soft">
                      Peran
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-line last:border-b-0 hover:bg-canvas/70"
                    >
                      <td className="px-3 py-2.5 align-middle">
                        <p className="font-bold text-ink">{a.name}</p>
                        <p className="text-xs text-ink-soft">{a.email}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right align-middle">
                        <Chip
                          tone={a.role === "ADMIN" ? "brand" : "neutral"}
                          size="sm"
                        >
                          {a.role === "ADMIN" ? "Administrator" : "Koordinator"}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form
              onSubmit={handleAddStaff}
              className="space-y-3 border-t border-line pt-4"
            >
              <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
                <UserPlus
                  size={16}
                  className="text-brand-strong"
                  aria-hidden="true"
                />
                <span>Tambah akun petugas baru</span>
              </p>

              <div>
                <label
                  htmlFor="stf-name"
                  className="block text-sm font-bold text-ink"
                >
                  Nama petugas
                </label>
                <input
                  id="stf-name"
                  type="text"
                  required
                  placeholder="Contoh: dr. Hendra Wijaya"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base text-ink placeholder:text-ink-muted transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="stf-email"
                  className="block text-sm font-bold text-ink"
                >
                  Email masuk petugas
                </label>
                <input
                  id="stf-email"
                  type="email"
                  required
                  placeholder="hendra@utd-surabaya.id"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base text-ink placeholder:text-ink-muted transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="stf-pass"
                    className="block text-sm font-bold text-ink"
                  >
                    Kata sandi
                  </label>
                  <input
                    id="stf-pass"
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base text-ink placeholder:text-ink-muted transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="stf-role"
                    className="block text-sm font-bold text-ink"
                  >
                    Peran akses
                  </label>
                  <select
                    id="stf-role"
                    value={staffRole}
                    onChange={(e) =>
                      setStaffRole(e.target.value as "COORDINATOR" | "ADMIN")
                    }
                    className="mt-1.5 h-11 w-full rounded-input border border-field bg-white px-3 text-base font-bold text-ink transition-colors focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none"
                  >
                    <option value="COORDINATOR">Koordinator UTD</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingStaff}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong disabled:opacity-60"
              >
                {savingStaff ? "Menambahkan..." : "Buat akun petugas baru"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
