"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BellRing,
  CalendarCheck,
  QrCode,
  ShieldCheck,
  TriangleAlert,
  UserCheck,
} from "lucide-react";
import { PublicHeader } from "@/components/ui/Navigation";

const TEST_ACCOUNTS = [
  {
    label: "Admin Sistem UTD",
    email: "admin@nadikita.test",
    sublabel: "Akses penuh ruang kendali admin, pengaturan aturan UTD, dan metrik",
    isAdmin: true,
  },
  {
    label: "Bu Ratna (Koordinator UTD)",
    email: "ratna.koordinator@nadikita.test",
    sublabel: "Akses penuh manajemen stok, kampanye, verifikasi KTP, dan antrean",
    isAdmin: true,
  },
  {
    label: "Rizky Pratama (Pendonor B+)",
    email: "relawan01@contoh.test",
    sublabel: "Status siap donor dan KTP terverifikasi",
    isAdmin: false,
  },
  {
    label: "Sari Wijaya (Pendonor B+)",
    email: "relawan02@contoh.test",
    sublabel: "Memiliki jadwal tiket QR aktif hari ini",
    isAdmin: false,
  },
];

const REASONS = [
  {
    Icon: CalendarCheck,
    title: "Pesan jadwal 30 menit",
    body: "Pilih jam kedatangan yang pasti, tanpa antre panjang di UTD.",
  },
  {
    Icon: QrCode,
    title: "Simpan tiket QR",
    body: "Tunjukkan tiket di meja pendaftaran untuk masuk antrean.",
  },
  {
    Icon: BellRing,
    title: "Dapat undangan saat stok kritis",
    body: "UTD hanya mengundang Anda bila sudah lewat masa jeda 60 hari.",
  },
  {
    Icon: ShieldCheck,
    title: "Data dijaga petugas UTD",
    body: "KTP dipakai untuk verifikasi identitas dan usia, bukan untuk hal lain.",
  },
];

const inputClass =
  "mt-1.5 h-12 w-full rounded-input border border-field bg-white px-3 text-base text-ink placeholder:text-ink-muted transition-colors duration-150 focus:border-brand-strong focus:ring-2 focus:ring-brand/20 focus:outline-none";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loginWithCredentials(targetEmail: string, targetPass: string) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: targetPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error?.message || "Gagal masuk ke akun.");
        setLoading(false);
        return;
      }
      const params =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;
      const nextParam = params?.get("next");
      const targetUrl =
        data.redirectTo === "/koordinator"
          ? "/koordinator"
          : nextParam && (nextParam.startsWith("/donor") || nextParam.startsWith("/u/"))
            ? nextParam
            : data.redirectTo || "/donor";
      router.push(targetUrl);
      router.refresh();
    } catch {
      setErrorMsg("Koneksi terputus. Coba lagi.");
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await loginWithCredentials(email, password);
  }

  return (
    <div className="min-h-screen bg-canvas">
      <PublicHeader />

      <main
        id="konten-utama"
        className="mx-auto max-w-[1040px] px-4 py-10 sm:px-6 sm:py-16"
      >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-16">
          {/* Kolom formulir */}
          <section aria-labelledby="judul-masuk">
            <div className="rounded-panel border border-line bg-white p-5 sm:p-8">
              <h1
                id="judul-masuk"
                className="text-[32px] leading-[40px] font-bold text-ink"
              >
                Masuk ke Nadi Kita
              </h1>
              <p className="mt-2 max-w-[60ch] text-base text-ink-soft">
                Gunakan email dan kata sandi yang Anda daftarkan. Petugas UTD
                memakai halaman yang sama untuk membuka ruang kendali.
              </p>

              {errorMsg && (
                <div
                  role="alert"
                  className="mt-6 flex items-start gap-3 rounded-input border border-brand/30 bg-blush px-4 py-3 text-sm text-ink"
                >
                  <TriangleAlert
                    size={18}
                    className="mt-0.5 shrink-0 text-brand-strong"
                    aria-hidden="true"
                  />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-sm font-bold text-ink"
                  >
                    Alamat email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-bold text-ink"
                  >
                    Kata sandi
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-input bg-brand px-5 text-base font-bold text-white transition-colors duration-150 hover:bg-brand-strong disabled:opacity-60"
                >
                  {loading ? "Memproses..." : "Masuk"}
                </button>
              </form>

              <p className="mt-6 border-t border-line pt-5 text-base text-ink-soft">
                Belum punya akun?{" "}
                <Link
                  href="/daftar"
                  className="inline-flex min-h-11 items-center font-bold text-brand-strong underline-offset-4 hover:underline"
                >
                  Daftar sebagai pendonor
                </Link>
              </p>
            </div>

            {/* Akun uji bawaan */}
            <div className="mt-6 px-1">
              <h2 className="text-base font-bold text-ink">Akun uji coba</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Semua akun memakai kata sandi{" "}
                <code className="rounded-[4px] bg-white px-1.5 py-0.5 text-ink">
                  nadikita2026
                </code>
                .
              </p>

              <ul className="mt-3 divide-y divide-line border-y border-line">
                {TEST_ACCOUNTS.map((acc) => (
                  <li
                    key={acc.email}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      {acc.isAdmin ? (
                        <ShieldCheck
                          size={18}
                          className="mt-0.5 shrink-0 text-ink-soft"
                          aria-hidden="true"
                        />
                      ) : (
                        <UserCheck
                          size={18}
                          className="mt-0.5 shrink-0 text-ink-soft"
                          aria-hidden="true"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink">{acc.label}</p>
                        <p className="text-sm break-all text-ink-soft">
                          {acc.email}
                        </p>
                        <p className="mt-0.5 text-sm text-ink-muted">
                          {acc.sublabel}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 pl-[30px] sm:pl-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(acc.email);
                          setPassword("nadikita2026");
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-input px-3 text-sm font-medium text-ink-soft transition-colors duration-150 hover:bg-white hover:text-ink"
                      >
                        Isi formulir
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setEmail(acc.email);
                          setPassword("nadikita2026");
                          loginWithCredentials(acc.email, "nadikita2026");
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-input border border-field bg-white px-4 text-sm font-bold text-ink transition-colors duration-150 hover:bg-canvas disabled:opacity-60"
                      >
                        Masuk langsung
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Kolom informasi */}
          <aside aria-labelledby="judul-alasan" className="lg:pt-8">
            <h2
              id="judul-alasan"
              className="text-[22px] leading-[30px] font-bold text-ink"
            >
              Mengapa perlu akun?
            </h2>
            <p className="mt-2 max-w-[60ch] text-base text-ink-soft">
              Akun membantu UTD PMI Kota Surabaya mengatur kedatangan pendonor
              agar tidak menumpuk di jam yang sama.
            </p>

            <ul className="mt-6 space-y-5">
              {REASONS.map(({ Icon, title, body }) => (
                <li key={title} className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-input border border-line bg-white text-brand-strong">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-base font-bold text-ink">{title}</p>
                    <p className="mt-0.5 text-[15px] text-ink-soft">{body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-8 border-t border-line pt-5 text-sm text-ink-muted">
              Hanya ingin melihat stok darah hari ini?{" "}
              <Link
                href="/stok"
                className="inline-flex min-h-11 items-center font-bold text-brand-strong underline-offset-4 hover:underline"
              >
                Lihat papan stok
              </Link>
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
