import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";

// Font tunggal sesuai rekomendasi ui-ux-pro-max (Accessibility First)
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--font-atkinson",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nadi Kita | Stok Darah & Jadwal Donor UTD PMI Surabaya",
  description:
    "Lihat stok darah UTD PMI Kota Surabaya hari ini, cek masa jeda 60 hari, dan pesan jadwal donor 30 menit dengan tiket QR.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={atkinson.variable}>
      <body className="min-h-screen bg-canvas text-ink antialiased selection:bg-brand selection:text-white">
        <a href="#konten-utama" className="skip-link">
          Lewati ke konten utama
        </a>
        {children}
      </body>
    </html>
  );
}
