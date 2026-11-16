"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarClock,
  ClipboardCheck,
  Clock,
  Droplet,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  ScanLine,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  donorId: string | null;
  bloodGroup: string | null;
  bloodGroupDisplay?: string | null;
  ktpVerified: boolean | null;
  activeTicketId?: string | null;
}

function useSessionUser(initialUser?: SessionUser | null) {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(initialUser ?? null);
  const [loaded, setLoaded] = useState(Boolean(initialUser));

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (active) {
          setUser(json?.user ?? json?.data ?? null);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  return { user, loaded, setUser };
}

async function performLogout(
  router: ReturnType<typeof useRouter>,
  onDone?: () => void
) {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    onDone?.();
    router.push("/masuk");
    router.refresh();
  }
}

/* Kelas tombol bersama (MASTER.md bagian 4) */
const BTN_PRIMARY =
  "inline-flex h-11 items-center justify-center gap-2 rounded-input bg-brand px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-strong";
const BTN_SECONDARY =
  "inline-flex h-11 items-center justify-center gap-2 rounded-input border border-field bg-white px-4 text-sm font-bold text-ink transition-colors duration-150 hover:bg-canvas";

const PUBLIC_LINKS = [
  { href: "/stok", label: "Stok darah" },
  { href: "/#jadwal-utd", label: "Jadwal donor" },
  { href: "/#cek-kelayakan", label: "Cek kelayakan" },
  { href: "/#cara-kerja", label: "Cara donor" },
];

export function PublicHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loaded, setUser } = useSessionUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    await performLogout(router, () => {
      setUser(null);
      setLoggingOut(false);
      setMobileMenuOpen(false);
    });
  }

  const isStaff = user?.role === "COORDINATOR" || user?.role === "ADMIN";
  const accountHref = isStaff ? "/koordinator" : "/donor";
  const accountLabel = isStaff ? "Dashboard Admin" : "Dashboard saya";

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo href="/" subtitle="UTD PMI Kota Surabaya" />

        <nav
          aria-label="Navigasi utama"
          className="hidden items-center gap-1 lg:flex"
        >
          {PUBLIC_LINKS.map((l) => {
            const active = l.href === pathname;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-10 items-center rounded-input px-3 text-[15px] font-medium transition-colors duration-150 ${
                  active
                    ? "text-brand-strong"
                    : "text-ink-soft hover:bg-canvas hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {!loaded ? (
            <div className="h-11 w-44" aria-hidden="true" />
          ) : user ? (
            <>
              <Link href={accountHref} className={BTN_PRIMARY}>
                {isStaff ? (
                  <LayoutDashboard size={17} aria-hidden="true" />
                ) : (
                  <UserRound size={17} aria-hidden="true" />
                )}
                <span>{accountLabel}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className={BTN_SECONDARY}
              >
                <LogOut size={16} aria-hidden="true" />
                <span>{loggingOut ? "Keluar..." : "Keluar"}</span>
              </button>
            </>
          ) : (
            <>
              <Link href="/masuk" className={BTN_SECONDARY}>
                Masuk
              </Link>
              <Link href="/daftar" className={BTN_PRIMARY}>
                Daftar jadi pendonor
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-expanded={mobileMenuOpen}
          aria-controls="menu-publik"
          aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
          className="inline-flex h-11 w-11 items-center justify-center rounded-input border border-line bg-white text-ink transition-colors hover:bg-canvas lg:hidden"
        >
          {mobileMenuOpen ? (
            <X size={20} aria-hidden="true" />
          ) : (
            <Menu size={20} aria-hidden="true" />
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          id="menu-publik"
          className="border-t border-line bg-white px-4 pt-2 pb-5 shadow-[var(--shadow-float)] lg:hidden"
        >
          <nav aria-label="Navigasi utama ponsel" className="flex flex-col">
            {PUBLIC_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-12 items-center border-b border-line text-base font-medium text-ink last:border-b-0"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4">
            {user ? (
              <div className="space-y-2">
                <p className="text-sm text-ink-muted">
                  Masuk sebagai{" "}
                  <span className="font-bold text-ink">{user.name}</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={accountHref}
                    onClick={() => setMobileMenuOpen(false)}
                    className={BTN_PRIMARY}
                  >
                    {accountLabel}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className={BTN_SECONDARY}
                  >
                    <LogOut size={16} aria-hidden="true" />
                    <span>{loggingOut ? "Keluar..." : "Keluar"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/masuk"
                  onClick={() => setMobileMenuOpen(false)}
                  className={BTN_SECONDARY}
                >
                  Masuk
                </Link>
                <Link
                  href="/daftar"
                  onClick={() => setMobileMenuOpen(false)}
                  className={BTN_PRIMARY}
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard Admin & Petugas UTD                                       */
/* ------------------------------------------------------------------ */

const COORD_GROUPS: {
  title: string;
  items: {
    href: string;
    label: string;
    Icon: typeof Droplet;
    exact?: boolean;
    matchPrefix?: string;
  }[];
}[] = [
  {
    title: "Operasional",
    items: [
      {
        href: "/koordinator",
        label: "Ringkasan",
        Icon: LayoutDashboard,
        exact: true,
      },
      { href: "/koordinator/stok", label: "Stok darah", Icon: Droplet },
      {
        href: "/koordinator/permintaan/baru",
        label: "Permintaan donor",
        Icon: Users,
        matchPrefix: "/koordinator/permintaan",
      },
      { href: "/koordinator/antrean", label: "Antrean QR", Icon: ScanLine },
    ],
  },
  {
    title: "Data & Pengaturan",
    items: [
      {
        href: "/koordinator/pendonor",
        label: "Pendonor & KTP",
        Icon: FileCheck2,
      },
      {
        href: "/koordinator/slot",
        label: "Kapasitas jadwal",
        Icon: CalendarClock,
      },
      {
        href: "/koordinator/metrik",
        label: "Metrik & audit",
        Icon: ClipboardCheck,
      },
      {
        href: "/koordinator/pengaturan",
        label: "Pengaturan",
        Icon: Settings,
      },
    ],
  },
];

export function CoordinatorSidebar({
  initialUser,
}: {
  initialUser?: SessionUser | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useSessionUser(initialUser);
  const [loggingOut, setLoggingOut] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    await performLogout(router, () => {
      setUser(null);
      setLoggingOut(false);
    });
  }

  const officerName = user?.name || "Admin UTD";
  const officerEmail = user?.email || "admin@nadikita.test";
  const officerRoleLabel =
    user?.role === "ADMIN" ? "Administrator UTD" : "Koordinator UTD";
  const officerInitial = officerName.charAt(0).toUpperCase();

  const navList = (
    <nav aria-label="Navigasi dashboard admin UTD" className="space-y-5">
      {COORD_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1.5 text-xs font-medium text-ink-muted">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map(({ href, label, Icon, exact, matchPrefix }) => {
              const isActive = exact
                ? pathname === href
                : pathname.startsWith(matchPrefix || href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative flex h-10 items-center gap-3 rounded-input px-3 text-[15px] transition-colors duration-150 ${
                      isActive
                        ? "bg-blush font-bold text-brand-strong"
                        : "font-medium text-ink-soft hover:bg-canvas hover:text-ink"
                    }`}
                  >
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-brand"
                      />
                    )}
                    <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const officerPanel = (
    <div className="border-t border-line p-3">
      <div className="flex items-center gap-3 px-1 py-1">
        <div
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white"
        >
          {officerInitial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{officerName}</p>
          <p className="truncate text-xs text-ink-muted">{officerEmail}</p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5 rounded-input border border-line bg-canvas px-2.5 py-1.5 text-xs font-bold text-ink-soft">
        <ShieldCheck size={14} className="shrink-0 text-ok-ink" aria-hidden="true" />
        <span className="truncate">{officerRoleLabel}</span>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="mt-2 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-input border border-line bg-white px-3 text-sm font-bold text-ink-soft transition-colors hover:border-brand hover:bg-blush/40 hover:text-brand-strong"
      >
        <LogOut size={15} aria-hidden="true" />
        <span>{loggingOut ? "Keluar..." : "Keluar dari akun"}</span>
      </button>
    </div>
  );

  return (
    <>
      {/* Bilah atas ponsel & tablet */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
        <Logo href="/koordinator" subtitle="Dashboard Admin UTD" />
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Buka menu dashboard"
          aria-expanded={drawerOpen}
          className="inline-flex h-11 w-11 items-center justify-center rounded-input border border-line text-ink hover:bg-canvas"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Laci menu ponsel */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu dashboard admin UTD"
        >
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(300px,86vw)] flex-col bg-white shadow-[var(--shadow-float)]">
            <div className="flex h-14 items-center justify-between border-b border-line px-4">
              <Logo href="/koordinator" subtitle="Dashboard Admin UTD" />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded-input text-ink hover:bg-canvas"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">{navList}</div>
            {officerPanel}
          </div>
        </div>
      )}

      {/* Sidebar desktop */}
      <aside
        aria-label="Dashboard Admin UTD"
        className="hidden border-r border-line bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[248px] lg:shrink-0 lg:flex-col"
      >
        <div className="flex h-16 items-center border-b border-line px-4">
          <Logo href="/koordinator" subtitle="Dashboard Admin UTD" />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">{navList}</div>
        {officerPanel}
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard Pendonor (tanpa tautan Situs publik)                      */
/* ------------------------------------------------------------------ */

export function DonorNavigation({
  activeTicketId,
  initialUser,
}: {
  activeTicketId?: string;
  initialUser?: SessionUser | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useSessionUser(initialUser);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await performLogout(router, () => {
      setUser(null);
      setLoggingOut(false);
    });
  }

  const resolvedTicketId =
    activeTicketId || user?.activeTicketId || "aktif";
  const groupBadge = user?.bloodGroupDisplay || user?.bloodGroup;

  const items = [
    { href: "/donor", label: "Beranda", Icon: Droplet, exact: true },
    {
      href: `/donor/tiket/${resolvedTicketId}`,
      label: "Tiket QR",
      Icon: QrCode,
      matchPrefix: "/donor/tiket",
    },
    { href: "/donor/riwayat", label: "Riwayat", Icon: Clock },
    { href: "/donor/profil", label: "Profil", Icon: UserRound },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-[880px] items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Logo href="/donor" subtitle="Dashboard pendonor" />
            {groupBadge && (
              <span
                className="inline-flex h-7 items-center rounded-input border border-brand/30 bg-blush px-2 text-sm font-bold text-brand-strong tabular-nums"
                aria-label={`Golongan darah ${groupBadge}`}
              >
                {groupBadge}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <nav
              aria-label="Navigasi pendonor"
              className="hidden items-center gap-1 md:flex"
            >
              {items.map(({ href, label, exact, matchPrefix }) => {
                const isActive = exact
                  ? pathname === href
                  : pathname.startsWith(matchPrefix || href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`inline-flex h-10 items-center rounded-input px-3 text-[15px] transition-colors duration-150 ${
                      isActive
                        ? "bg-blush font-bold text-brand-strong"
                        : "font-medium text-ink-soft hover:bg-canvas hover:text-ink"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            <span
              className="mx-1 hidden h-6 w-px bg-line md:block"
              aria-hidden="true"
            />

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex h-10 items-center gap-1.5 rounded-input border border-line bg-white px-3 text-sm font-bold text-ink-soft transition-colors hover:border-brand hover:bg-blush/40 hover:text-brand-strong"
            >
              <LogOut size={16} aria-hidden="true" />
              <span>{loggingOut ? "Keluar..." : "Keluar"}</span>
            </button>
          </div>
        </div>
      </header>

      <nav
        aria-label="Navigasi pendonor ponsel"
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-4 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {items.map(({ href, label, Icon, exact, matchPrefix }) => {
          const isActive = exact
            ? pathname === href
            : pathname.startsWith(matchPrefix || href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                isActive
                  ? "font-bold text-brand-strong"
                  : "font-medium text-ink-muted"
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 h-[3px] w-10 rounded-b bg-brand"
                />
              )}
              <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
