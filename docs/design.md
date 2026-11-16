# Nadi Kita — Sistem Desain (design.md)

Tim Kita Peduli · STACK 2026
Versi 1.0 · 8 November 2026 · Dokumen pendamping: `planning.md`

Dokumen ini adalah acuan tunggal untuk tampilan, perilaku antarmuka, dan bahasa Nadi Kita. Bila ada keputusan visual yang belum tertulis di sini, putuskan dengan prinsip di bagian 1, lalu tambahkan ke dokumen ini.

---

## 1. Prinsip

1. **Data dulu, hiasan belakangan.** Pemeran utama produk adalah stok darah dan jadwal. Setiap elemen visual harus membantu membaca angka, status, atau langkah berikutnya.
2. **Satu elemen yang diingat.** Pil stok (`StockPill`) adalah ciri khas Nadi Kita: bentuk kapsul dari pamflet dipakai sebagai alat ukur stok. Elemen lain dibuat tenang dan disiplin.
3. **Mendesak, tapi tidak panik.** Rose pekat dipakai hemat: hanya untuk status kritis dan aksi utama. Halaman tidak boleh terasa seperti alarm.
4. **Bahasa manusia.** Kalimat aktif, kata sehari-hari, tanpa jargon sistem. Tombol menyebut apa yang akan terjadi.
5. **Aksesibel sejak awal.** Kontras terukur, tidak bergantung pada warna saja, bisa dipakai dengan keyboard dan layar sentuh, lalu menghormati `prefers-reduced-motion`.

---

## 2. Daftar anti-slop

Hal-hal berikut **dilarang** di Nadi Kita. Pakai sebagai daftar periksa saat review.

| Dilarang | Gantinya |
|---|---|
| Latar blob, gelombang, atau gradien dekoratif (pamflet memakainya, produk tidak) | Latar rata `canvas`. Pamflet hanya jadi sumber warna |
| Gradien pada tombol, kartu, atau teks | Warna solid |
| Kartu seragam bersudut sama dengan bayangan abu-abu yang sama | Hierarki radius dan border (bagian 5), bayangan hanya untuk lapisan yang melayang |
| Hero "angka besar + label kecil + gradien" | Hero berisi papan stok yang hidup |
| Tiga kartu fitur dengan ikon di lingkaran berwarna | Penjelasan singkat berbentuk langkah nyata, atau tidak ada sama sekali |
| Emoji sebagai ikon atau hiasan | Ikon garis konsisten (lucide, stroke 1,75) |
| Label ALL CAPS berjarak lebar di atas setiap judul (eyebrow) | Judul langsung. Label hanya bila membawa informasi |
| Satu kata di judul diberi warna atau miring | Judul satu warna |
| Teks meta dipisah titik tengah (`A · B · C`) dan tanda panah `→` di akhir tautan | Baris terpisah, tautan dengan kata kerja jelas |
| Angka berurutan (01, 02, 03) di bagian yang bukan urutan | Nomor hanya untuk langkah yang memang berurutan (stepper, wizard) |
| Mono kecil untuk semua label | Mono hanya untuk kode tiket dan ID |
| Testimoni, logo mitra, atau statistik karangan | Tidak ada. Hanya data nyata dari sistem atau relawan |
| Foto stok manusia tersenyum | Tanpa foto. Bila perlu, ilustrasi garis sederhana buatan sendiri |
| Teks lorem ipsum atau salinan "revolusioner", "terdepan", "seamless" | Salinan nyata, spesifik, berbahasa Indonesia (bagian 9) |
| Animasi masuk pada setiap bagian dan hover bergerak pada setiap kartu | Satu momen animasi terarah (bagian 8) |
| Hitam murni atau abu-abu netral dingin untuk teks | Warna tinta berundertone rose (bagian 3) |
| Warna di luar palet (ungu, biru, hijau) | Hanya palet pamflet + turunannya (bagian 3) |

---

## 3. Warna

### 3.1 Palet pamflet (enam warna)

| Token | Hex | Peran |
|---|---|---|
| `brand` | `#E11D48` | Aksi utama (tombol primer), status Kritis, penekanan terkuat |
| `pink` | `#F472B6` | Isi pil stok berstatus Aman, seri data sekunder, ilustrasi |
| `coral` | `#FB7185` | Aksen sekunder, hover pada elemen tint, seri data ketiga |
| `apricot` | `#FDBA74` | Status Menipis, peringatan, penanda "perlu perhatian" |
| `blush` | `#FDE1E7` | Latar area ringan, jalur (track) pil stok, baris terpilih |
| `canvas` | `#FFF7F9` | Latar halaman |

### 3.2 Turunan (satu keluarga warna yang sama)

Palet enam warna tidak cukup untuk teks dan batas yang aksesibel, sehingga ditambah turunan berikut. Semuanya berundertone rose supaya menyatu dengan pamflet.

| Token | Hex | Peran |
|---|---|---|
| `brand-strong` | `#BE123C` | Teks dan tautan berwarna, hover/pressed tombol primer, pesan error |
| `ink` | `#2B0F17` | Teks utama |
| `ink-soft` | `#5C3A44` | Teks sekunder |
| `ink-muted` | `#7A5B65` | Teks pendukung, keterangan (hanya di `canvas`, putih, dan `blush`) |
| `line` | `#F3D3DB` | Pemisah halus, batas panel |
| `line-strong` | `#E4B4C0` | Batas dekoratif yang kuat (bukan batas kolom isian) |
| `field` | `#9A7480` | Batas kolom isian dan kontrol (lolos 3:1) |
| `white` | `#FFFFFF` | Permukaan panel dan kolom isian |

Putih (`#FFFFFF`) dipakai untuk panel di atas `canvas` agar kolom isian dan tabel terbaca. Tidak ada hijau: status "Aman" memakai `pink` + ikon centang + teks, bukan warna hijau yang tidak ada di pamflet.

### 3.3 Kontras terukur (WCAG 2.2)

Nilai perkiraan dari rumus luminansi relatif; verifikasi ulang dengan alat saat implementasi.

| Teks / elemen | Latar | Rasio | Hasil |
|---|---|---|---|
| `ink` | `canvas` | sekitar 16:1 | Lolos AAA |
| `ink-soft` | `canvas` | sekitar 9:1 | Lolos AAA |
| `ink-muted` | `canvas` | sekitar 5,6:1 | Lolos AA |
| `ink-muted` | `blush` | sekitar 4,9:1 | Lolos AA |
| `white` | `brand` | sekitar 4,7:1 | Lolos AA |
| `brand` (sebagai teks) | `canvas` | sekitar 4,46:1 | **Tidak lolos** untuk teks normal. Jangan dipakai sebagai teks |
| `brand-strong` | `canvas` | sekitar 6,0:1 | Lolos AA |
| `brand-strong` | `blush` | sekitar 5,1:1 | Lolos AA |
| `white` | `brand-strong` | sekitar 6,3:1 | Lolos AA |
| `ink` | `apricot` | sekitar 10:1 | Lolos AAA |
| `ink` | `pink` | sekitar 6,7:1 | Lolos AA |
| `field` | `white` | sekitar 4:1 | Lolos 3:1 untuk batas kontrol |

**Aturan turunan:**
- `brand` hanya sebagai **latar** (tombol, chip Kritis, isi pil). Teks berwarna rose selalu `brand-strong`.
- `pink`, `coral`, dan `apricot` tidak pernah dipakai sebagai teks.
- Isi pil `pink` dan `apricot` di atas `blush` rasionya sekitar 2,2:1 hingga 2,5:1 untuk bentuk grafis. Ini diterima karena informasi **tidak** hanya dibawa warna: angka, teks status, dan penanda ambang selalu tampil, dan pil punya garis tepi `line-strong`.

### 3.4 Pemetaan status

| Konteks | Status | Tampilan |
|---|---|---|
| Stok | Kritis | Isi `brand`, chip latar `brand` teks putih, ikon peringatan |
| Stok | Menipis | Isi `apricot`, chip latar `apricot` teks `ink`, ikon panah turun |
| Stok | Aman | Isi `pink`, chip latar `blush` teks `ink-soft`, ikon centang |
| Jadwal | Terjadwal | Chip latar `apricot` teks `ink` |
| Jadwal | Hadir / Selesai | Chip latar `ink` teks putih, ikon centang |
| Jadwal | Dibatalkan / Tidak hadir | Chip garis `field`, teks `ink-soft`, tanpa isi |
| Undangan | Terkirim, Dibuka, Dipesan, Kedaluwarsa | Chip garis `field` dengan teks status. Hanya "Dipesan" memakai latar `blush` |

Setiap status selalu punya **kata** dan **ikon**. Warna membantu, bukan satu-satunya penanda.

### 3.5 Proporsi pemakaian

Sekitar 70% permukaan `canvas` dan `white`, 20% `blush` dan teks `ink`, kurang dari 10% `brand` dan aksen lain. Pada satu layar, hanya **satu** tombol primer (`brand`).

---

## 4. Tipografi

### 4.1 Keluarga huruf

| Peran | Huruf | Alasan |
|---|---|---|
| UI dan konten | **Plus Jakarta Sans** (400, 500, 600, 700) | Dirancang di Indonesia, terbaca jelas di layar kecil, bentuk angka dan huruf Latin bersih |
| Kode tiket, ID | **JetBrains Mono** (500) | Hanya untuk kode seperti `NK-7H3K9Q2M` yang harus dibaca per karakter |

Gunakan `font-variant-numeric: tabular-nums` pada angka stok, jam, dan tabel.

### 4.2 Skala

Dasar 16 px, rasio sekitar 1,25. Teks isi tidak lebih kecil dari 14 px; 12 px hanya untuk keterangan sekunder.

| Token | Ukuran / tinggi baris | Berat | Pemakaian |
|---|---|---|---|
| `text-xs` | 12 / 16 | 500 | Keterangan waktu pembaruan |
| `text-sm` | 14 / 20 | 400–600 | Tabel, chip, bantuan isian |
| `text-base` | 16 / 26 | 400 | Teks isi, isian formulir |
| `text-lg` | 18 / 28 | 500 | Pengantar bagian |
| `text-xl` | 22 / 30 | 700 | Judul bagian (H3) |
| `text-2xl` | 28 / 36 | 700 | Judul halaman (H2) |
| `text-3xl` | 36 / 44 | 700 | Judul halaman publik (H1, mobile) |
| `text-4xl` | 48 / 54 | 700 | H1 halaman depan (desktop) |

### 4.3 Aturan

- Judul: sentence case, `letter-spacing: -0.015em` untuk ukuran 28 px ke atas, satu warna (`ink`).
- Panjang baris teks isi maksimal 68 karakter (`max-w-[68ch]`).
- Tidak ada teks ALL CAPS. Tidak ada huruf miring untuk penekanan di UI; gunakan berat 600.
- Angka stok memakai tanda minus sebenarnya: **O−**, **AB−** (U+2212), dan dibacakan "O negatif" oleh pembaca layar.
- Tanggal: `8 Nov 2026`, jam: `09.30 WIB` (titik, bukan titik dua, sesuai kebiasaan Indonesia).
- Muat huruf dengan `next/font` (tanpa permintaan ke Google saat runtime), `display: swap`.

---

## 5. Tata letak, jarak, bentuk

### 5.1 Grid dan wadah

| Titik henti | Lebar | Kolom | Margin halaman | Jarak antar kolom |
|---|---|---|---|---|
| Mobile | 360–639 | 4 | 16 | 16 |
| Tablet | 640–1023 | 8 | 24 | 24 |
| Desktop | 1024–1279 | 12 | 32 | 24 |
| Lebar | 1280+ | 12, wadah maks 1200 | auto | 24 |

Perataan: **rata kiri** di seluruh produk. Tidak ada teks rata tengah kecuali keadaan kosong dan layar sukses singkat.

### 5.2 Skala jarak (basis 4 px)

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`. Jarak antar bagian halaman 48 (mobile 32). Padding panel 24 (mobile 16).

### 5.3 Hierarki radius

Radius berbeda sesuai peran supaya bentuk ikut membawa makna.

| Token | Nilai | Dipakai pada |
|---|---|---|
| `radius-pill` | 9999 px | Tombol, chip, pil stok, item navigasi aktif |
| `radius-input` | 10 px | Kolom isian, select, kotak pilihan |
| `radius-panel` | 16 px | Panel, tabel, kartu undangan |
| `radius-sheet` | 24 px (sudut atas) | Dialog, bottom sheet di mobile |

### 5.4 Elevasi

- Panel: **tanpa bayangan**, cukup batas 1 px `line`.
- Lapisan melayang (dialog, menu, toast): `0 8px 24px rgba(43, 15, 23, 0.12)` (bayangan bernuansa tinta, bukan abu-abu).
- Tidak ada lebih dari dua tingkat elevasi.

---

## 6. Komponen

Setiap komponen punya status: default, hover, fokus, aktif, nonaktif, error, memuat.

### 6.1 Fokus (global)

`outline: 2px solid #BE123C; outline-offset: 2px;` pada semua elemen interaktif. Tidak boleh dihapus tanpa pengganti. Pada latar `brand`, fokus memakai outline `ink`.

### 6.2 Tombol

| Varian | Tampilan | Pemakaian |
|---|---|---|
| Primer | Latar `brand`, teks putih; hover `brand-strong` | Satu per layar: "Kirim 18 undangan", "Konfirmasi jadwal" |
| Sekunder | Latar putih, batas 1 px `field`, teks `ink` | Aksi pendamping: "Simpan draf" |
| Teks | Tanpa latar, teks `brand-strong`, garis bawah saat hover | Aksi tersier: "Lihat riwayat" |
| Hapus/Batal | Batas `field`, teks `ink`; konfirmasi lewat dialog | "Batalkan jadwal" |

Tinggi 44 px (kecil 36 px hanya di desktop, besar 52 px untuk aksi utama mobile). Padding horizontal 20 px. Nonaktif: latar `blush`, teks `ink-muted`, ada keterangan alasan di dekatnya. Memuat: spinner kecil + teks tetap, lebar tidak berubah.

### 6.3 Kolom isian

- Tinggi 48 px (mobile) atau 44 px (desktop), radius 10, latar putih, batas 1 px `field`.
- Label di atas kolom, selalu terlihat (bukan placeholder sebagai label). Teks bantuan di bawah, `text-sm` `ink-muted`.
- Fokus: batas 2 px `brand-strong`, tanpa glow.
- Error: batas `brand-strong`, ikon + pesan di bawah dalam `brand-strong`. Pesan menyebut cara memperbaiki.
- Angka (berat badan, jam tidur): `inputmode="decimal"`, satuan di akhir kolom ("kg", "jam").
- Pilihan tunggal berjumlah sedikit memakai **kotak pilihan** (kartu radio) berukuran penuh, bukan dropdown.

### 6.4 Chip

Tinggi 28, radius pill, teks `text-sm` berat 600, selalu ada ikon dan kata (bagian 3.4).

### 6.5 StockPill (elemen khas)

Alat ukur stok berbentuk kapsul, satu per golongan darah.

```
 O−   ┌──────────────────────────────┐   2 kantong   ┌──────────┐
      │██████▌                    │                 │ ▲ Kritis │
      └─────────────┬────────────────┘                 └──────────┘
                    └ batas aman (garis tipis)
```

Anatomi dari kiri ke kanan: **golongan** (`text-xl`, berat 700) · **pil** (tinggi 36, radius pill, jalur `blush`, batas 1 px `line-strong`, isi sesuai status, garis tipis penanda batas aman) · **angka** (`2 kantong`, tabular) · **chip status**.

Aturan:
- Skala pil: `max = max(safeAt × 1,5, units)`, isi minimum selebar tingginya agar tetap berbentuk kapsul.
- Status: `units ≤ criticalAt` → Kritis, `units < safeAt` → Menipis, lainnya Aman.
- Aksesibilitas: `role="meter"`, `aria-valuenow`, `aria-valuetext="2 kantong, kritis"`, `aria-label="Golongan O negatif"`.
- Susunan: grid 2 kolom × 4 baris di desktop, 1 kolom di mobile. Urutan tetap: A+, B+, O+, AB+, A−, B−, O−, AB−, supaya posisi bisa dihafal.
- Saat data diperbarui lewat polling, lebar isi beranimasi 400 ms (bagian 8).

### 6.6 Tabel

Header latar `blush`, teks `ink-soft` berat 600, tanpa huruf kapital. Baris tinggi 48, pemisah 1 px `line`, hover `blush` 40% opasitas, baris terpilih `blush`. Wadah memakai radius panel dan `overflow-x: auto` di mobile. Kolom angka rata kanan.

Tabel ranking donor menampilkan: peringkat, nama (singkat), golongan, terakhir donor, skor sebagai batang tipis + angka, alasan (satu kalimat), dan status undangan.

### 6.7 Pemilih slot

Grid tombol jam (`09.00`, `09.30`, …) per hari. Tiap tombol menampilkan sisa kuota sebagai teks kecil ("2 tersisa"). Penuh: nonaktif dengan keterangan "Penuh", bukan disembunyikan. Terpilih: latar `ink`, teks putih. Tab hari di atas (maksimal 7).

### 6.8 Stepper (wizard undangan)

Langkah nyata berurutan, sehingga bernomor: **1 Pemeriksaan awal · 2 Pilih jam · 3 Konfirmasi**. Langkah selesai diberi centang. Mobile: tampilkan "Langkah 2 dari 3" dan judul langkah saja.

### 6.9 Tiket QR

Panel putih, batas `line`, radius panel. Isi: QR 220 × 220 di tengah dengan area kosong (quiet zone) putih 16 px, kode `NK-7H3K9Q2M` (mono 500, 20 px), jam dan hari, lokasi, daftar singkat apa yang dibawa. Tombol: "Tambah ke kalender", "Batalkan jadwal". Kecerahan layar tidak diubah paksa, tetapi QR hitam `ink` di atas putih agar terbaca pemindai.

### 6.10 Banner dan peringatan

Bar horizontal radius 10, ikon di kiri.
- Info: latar `blush`, teks `ink`.
- Peringatan (data stok lama, kandidat kurang): latar `apricot`, teks `ink`.
- Error: latar putih, batas `brand-strong` 1,5 px, teks `ink`, ikon `brand-strong`.
- Banner prototipe di bagian atas semua halaman: tipis, latar `blush`, "Prototipe STACK 2026. Seluruh data di situs ini simulasi."

### 6.11 Dialog dan toast

Dialog: lebar maksimal 480, sudut `radius-sheet`, judul menyebut aksi, dua tombol (primer dan sekunder) dengan kata kerja spesifik. Toast: kiri bawah (desktop) atau atas (mobile), hilang setelah 5 detik, bisa ditutup, menggunakan kata kerja yang sama dengan tombol ("Jadwal dikonfirmasi").

### 6.12 Keadaan kosong, memuat, galat

- Kosong: ikon garis 48 px `ink-muted`, satu kalimat penjelasan, satu tombol aksi. Rata kiri.
- Memuat: kerangka (skeleton) latar `blush` tanpa animasi kilau. Pil stok memuat sebagai kapsul kosong.
- Galat: menjelaskan apa yang terjadi dan cara memperbaikinya, tanpa meminta maaf berlebihan (bagian 9).

### 6.13 Navigasi

- **Koordinator (desktop):** bilah samping 232 px, latar putih, batas kanan `line`. Item aktif berupa kapsul `blush` dengan teks `brand-strong`. Tablet: bilah ikon yang melebar.
- **Donor (mobile):** bilah bawah 64 px dengan empat item (Beranda, Tiket, Riwayat, Profil), ikon + label. Aktif: ikon dan label `brand-strong`, berat 700.
- **Publik:** header sederhana, logo di kiri, tautan Stok dan Cara kerja, tombol Masuk di kanan.

---

## 7. Layar (wireframe)

Wireframe menunjukkan hierarki dan posisi, bukan gaya akhir.

### 7.1 Halaman depan dan stok publik (`/`)

```
┌────────────────────────────────────────────────────────────────┐
│ Prototipe STACK 2026. Seluruh data di situs ini simulasi.      │
├────────────────────────────────────────────────────────────────┤
│ (logo) Nadi Kita                     Stok   Cara kerja [Masuk] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Darah yang dibutuhkan,        Stok hari ini                   │
│  donor yang sudah siap.        UTD Simulasi Surabaya           │
│                                Diperbarui 8 menit lalu         │
│  Nadi Kita menghubungkan       A+  ████████████    26  Aman    │
│  stok UTD dengan donor yang    B+  ███████▌        13  Menipis │
│  sudah melewati masa jeda      O+  █████████████   30  Aman    │
│  60 hari, lengkap dengan       AB+ ██████▌         11  Aman    │
│  jadwal 30 menit.              A−  ███▌             4  Menipis │
│                                B−  ██▌              3  Menipis │
│  [Masuk sebagai donor]         O−  █▌               2  Kritis  │
│  Saya koordinator UTD          AB− ▌                1  Kritis   │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│ Cara kerja (langkah berurutan, bernomor)                       │
│ 1 UTD memperbarui stok   2 Donor yang siap diundang            │
│ 3 Donor memilih jam      4 Datang dan scan tiket               │
└────────────────────────────────────────────────────────────────┘
```

Pembuka halaman adalah papan stok yang hidup (hal paling khas dari domain ini). Bagian "Cara kerja" bernomor karena memang urutan. Tidak ada kartu fitur.

### 7.2 Dasbor koordinator (`/koordinator`)

```
┌──────────┬─────────────────────────────────────────────────────┐
│ (logo)   │ Stok darah                                          │
│          │ UTD Simulasi Surabaya. Diperbarui 3 menit lalu      │
│ Dasbor   │                        [Perbarui stok] [Buat permintaan] │
│ Stok     │ ┌ banner (hanya jika ada status Kritis) ──────────┐ │
│ Permintaan│ │ O− dan AB− kritis. Buat permintaan donor.       │ │
│ Antrean  │ └──────────────────────────────────────────────────┘ │
│ Slot     │ ┌ Stok (8 StockPill, 2 kolom) ─────────────────────┐ │
│ Metrik   │ │ A+ ████  26 Aman        A−  ██   4 Menipis       │ │
│          │ │ B+ ███▌  13 Menipis     B−  █▌   3 Menipis       │ │
│          │ │ O+ █████ 30 Aman        O−  ▌    2 Kritis        │ │
│          │ │ AB+ ██   11 Aman        AB− ▌    1 Kritis        │ │
│          │ └──────────────────────────────────────────────────┘ │
│          │ Permintaan aktif                Antrean hari ini     │
│          │ ┌─────────────────────────┐ ┌──────────────────────┐ │
│          │ │ B+ · 8 kantong          │ │ 09.00  4 dari 4 slot │ │
│          │ │ 5 dari 8 sudah dipesan  │ │ 09.30  2 dari 4 slot │ │
│          │ │ Batas Jumat 13 Nov      │ │ Buka antrean         │ │
│          │ └─────────────────────────┘ └──────────────────────┘ │
└──────────┴─────────────────────────────────────────────────────┘
```

### 7.3 Buat permintaan donor (`/koordinator/permintaan/baru`)

```
┌──────────────────────────────────────────────────────────────┐
│ Buat permintaan donor                                         │
├─────────────────────────┬────────────────────────────────────┤
│ Golongan darah          │ Pratinjau peringkat donor          │
│ [ B+ ▾ ]                │ 64 donor memenuhi syarat           │
│ Target kantong          │ Terpilih 18 (perkiraan 8 kantong)  │
│ [ 8 ]                   │                                    │
│ Batas waktu             │ #  Nama        Terakhir  Skor      │
│ [ 13 Nov 2026 ]         │ 1  Dimas P.    4 bln    ▇▇▇▇ 0,52  │
│ Kelompok                │    Donor rutin (7 kali)            │
│ (•) Semua  ( ) Uji coba │ 2  Sari W.     5 bln    ▇▇▇▇ 0,47  │
│ Jumlah undangan         │ 3  ...                             │
│ [ 18 ]  Atur manual     │                                    │
│                         │ ┌ peringatan kapasitas (jika ada) ┐│
│                         │ └─────────────────────────────────┘│
│ [Simpan draf]           │ 46 donor lain masih masa jeda      │
│ [Kirim 18 undangan]     │ (tidak diundang).                  │
└─────────────────────────┴────────────────────────────────────┘
```

Pratinjau diperbarui saat formulir berubah (dengan jeda 400 ms). Daftar donor yang tersaring karena masa jeda bisa dibuka untuk menunjukkan fitur inti.

### 7.4 Antrean dan pemindai (`/koordinator/antrean`)

```
┌──────────────────────────────────────────────────────────────┐
│ Antrean hari ini                 Rabu 18 Nov 2026            │
├───────────────────────────┬──────────────────────────────────┤
│ Pemindai                  │ Jadwal per slot                  │
│ ┌───────────────────────┐ │ 09.00  4 dari 4                  │
│ │      (kamera)         │ │   Dimas P.     Hadir      [Selesai donor]
│ └───────────────────────┘ │   Sari W.      Terjadwal           │
│ Atau masukkan kode        │ 09.30  2 dari 4                  │
│ [ NK-________ ] [Cek]     │   Budi A.      Terjadwal           │
└───────────────────────────┴──────────────────────────────────┘
```

Hasil pemindaian muncul sebagai panel di bawah kamera: nama, golongan, jam, status, dan dua tombol: "Tandai selesai donor" (primer) serta "Tandai ditunda" (sekunder, meminta alasan). Di ponsel, pemindai penuh layar dengan daftar di bawah.

### 7.5 Beranda donor (`/donor`) — mobile

```
┌─────────────────────────┐
│ Halo, Rizky             │
│                         │
│ ┌─────────────────────┐ │
│ │ Anda sudah boleh    │ │
│ │ donor lagi.         │ │
│ │ Donor terakhir      │ │
│ │ 23 Sep 2026         │ │
│ └─────────────────────┘ │
│ Undangan untuk Anda     │
│ ┌─────────────────────┐ │
│ │ UTD Simulasi        │ │
│ │ Butuh darah B+      │ │
│ │ sampai 13 Nov       │ │
│ │ [Pilih jam]         │ │
│ └─────────────────────┘ │
│                         │
│ Beranda Tiket Riwayat Profil │
└─────────────────────────┘
```

Bila masih dalam masa jeda, panel utama menjadi hitung mundur: "Anda bisa donor lagi dalam 23 hari, mulai 22 Des 2026." dengan cincin progres tipis (`pink` di atas `blush`) dan teks. Cincin hanya pelengkap; informasi utama ada di teks.

### 7.6 Wizard undangan (`/u/[token]`) — mobile

```
Langkah 1 dari 3
Pemeriksaan awal
4 pertanyaan singkat. Petugas UTD tetap memeriksa
kesehatan Anda sebelum donor.

Berat badan Anda saat ini
[ 62        ] kg

Berapa jam Anda tidur semalam?
[ 6         ] jam

Hasil hemoglobin terakhir yang Anda tahu
(•) 12,5 g/dL atau lebih
( ) Di bawah 12,5 g/dL
( ) Saya tidak tahu

Tanggal donor terakhir Anda
23 Sep 2026   [Ubah]

[Lanjut ke pilih jam]
```

Hasil "belum memenuhi syarat" tampil sebagai halaman penjelasan: alasan, tanggal boleh coba lagi, dan tombol "Ingatkan saya" bila relevan. Tidak ada bahasa menghakimi.

### 7.7 Tiket (`/donor/tiket/[id]`)

```
┌────────────────────────────┐
│ Tiket donor                │
│ Rabu 18 Nov 2026, 09.30 WIB│
│                            │
│      ┌──────────────┐      │
│      │   [ QR ]     │      │
│      └──────────────┘      │
│      NK-7H3K9Q2M           │
│                            │
│ UTD Simulasi Surabaya      │
│ Bawa kartu identitas.      │
│ Datang 10 menit lebih awal.│
│                            │
│ [Tambah ke kalender]       │
│ Batalkan jadwal            │
└────────────────────────────┘
```

### 7.8 Metrik uji coba (`/koordinator/metrik`)

Tiga angka utama sebagai deretan sederhana (median waktu undang, median waktu booking, skor SUS), tabel rincian per tugas (n, median, kuartil, tingkat selesai), dan satu grafik batang horizontal sebaran waktu. Tanpa dekorasi.

---

## 8. Gerak

- **Satu momen terarah:** saat papan stok pertama kali tampil dalam sesi, isi pil tumbuh dari 0 ke nilainya selama 500 ms dengan jeda 40 ms antar golongan.
- **Gerak karena data berubah:** bila polling mengubah angka, isi pil bergeser dalam 400 ms.
- **Gerak karena aksi pengguna:** dialog dan sheet muncul 200 ms, centang berhasil muncul 200 ms.
- Easing: `cubic-bezier(0.2, 0.7, 0.2, 1)`. Tidak ada animasi masuk per bagian, tidak ada gerak hover pada kartu.
- `prefers-reduced-motion: reduce` → semua transisi di atas dimatikan; perubahan langsung terjadi.

---

## 9. Bahasa dan microcopy

### 9.1 Suara

Tenang, jelas, hormat. Menyapa dengan **"Anda"**. Kalimat aktif, kata sehari-hari, sentence case. Tanpa tanda seru, emoji, atau ajakan berlebihan. Tombol menyebut hasilnya; nama aksi sama di seluruh alur (tombol "Konfirmasi jadwal" menghasilkan toast "Jadwal dikonfirmasi").

### 9.2 Istilah baku

| Pakai | Hindari |
|---|---|
| Permintaan donor | Kampanye, broadcast, batch alert |
| Undangan | Invitation, notifikasi massal |
| Pemeriksaan awal | Skrining, self-screening |
| Masa jeda | Cooldown, recovery period |
| Tiket donor | QR pass |
| Kantong | Unit |
| Selesai donor | Complete, finalisasi |
| Jadwal, pilih jam | Slot, booking |

### 9.3 Contoh

**Tombol:** Kirim 18 undangan · Pilih jam · Konfirmasi jadwal · Pindai tiket · Tandai selesai donor · Perbarui stok · Batalkan jadwal

**Status stok:** Kritis · Menipis · Aman

**Keadaan kosong:**
- Permintaan: "Belum ada permintaan donor aktif. Buat permintaan saat stok satu golongan menipis." Tombol: *Buat permintaan donor*
- Riwayat: "Belum ada riwayat donor. Riwayat muncul setelah donor pertama Anda di UTD."
- Antrean: "Belum ada jadwal untuk hari ini."

**Galat:**
- Slot penuh: "Jam 09.00 baru saja penuh. Pilih jam lain di bawah."
- Sudah punya jadwal: "Anda sudah punya jadwal pada 18 Nov, 09.30. Batalkan dulu bila ingin memilih jam lain."
- Tautan kedaluwarsa: "Tautan undangan ini sudah tidak berlaku. Hubungi UTD untuk mendapat undangan baru."
- QR di luar jam: "Tiket ini untuk 09.30. Check-in dibuka mulai 09.00."
- Layanan skor tidak tersedia: "Peringkat sementara. Layanan skor belum merespons, urutan memakai aturan sederhana."
- Jaringan: "Koneksi terputus. Perubahan belum tersimpan. Coba lagi."

**Hasil pemeriksaan awal:**
- Memenuhi: "Anda memenuhi syarat awal. Pilih jam untuk donor." Catatan: "Ini pemeriksaan awal. Petugas UTD tetap memeriksa kesehatan Anda sebelum donor."
- Belum: "Anda belum bisa donor hari ini. Donor terakhir Anda 23 Okt; Anda bisa donor lagi mulai 22 Des."
- Hb tidak diketahui: "Tidak apa-apa. Petugas akan memeriksa hemoglobin Anda di lokasi."

**Data lama:** "Stok terakhir diperbarui 9 jam lalu. Angka mungkin sudah berubah."

**Banner prototipe:** "Prototipe STACK 2026. Seluruh data di situs ini simulasi."

**Persetujuan pendaftaran:** "Saya setuju dihubungi oleh UTD terkait permintaan donor. Data saya dipakai hanya untuk keperluan itu."

### 9.4 Format

Tanggal `18 Nov 2026`, jam `09.30 WIB`, angka `1.250` (titik ribuan), desimal koma (`12,5 g/dL`). Singkatan hanya yang umum (UTD, PMI, WIB).

---

## 10. Ikon, logo, gambar

- **Ikon:** `lucide-react`, ukuran 20 (16 di chip), stroke 1,75, selalu bersama teks bila membawa makna. Tidak ditempatkan di lingkaran berwarna. Ikon yang dipakai: `Droplet`, `TriangleAlert`, `TrendingDown`, `Check`, `QrCode`, `CalendarClock`, `Clock`, `Users`, `ClipboardCheck`, `ScanLine`, `X`.
- **Logo:** wordmark "Nadi Kita" (Plus Jakarta Sans 700) dengan tanda tetes darah `brand` yang di dalamnya terdapat garis denyut putih ("nadi"). Versi satu warna `ink` untuk cetak.

```svg
<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Nadi Kita">
  <path d="M16 3 C16 3 6 14 6 20 a10 10 0 0 0 20 0 C26 14 16 3 16 3 Z" fill="#E11D48"/>
  <path d="M9 19 h4 l2 -4 l3 8 l2 -4 h3" fill="none" stroke="#FFFFFF"
        stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

- **Gambar:** tanpa foto. Keadaan kosong memakai ikon garis. Favicon memakai tanda tetes.

---

## 11. Aksesibilitas

- Bahasa dokumen `lang="id"`. Judul halaman unik. Struktur judul berurutan (satu H1 per halaman).
- Kontras sesuai bagian 3.3. Warna tidak menjadi satu-satunya penanda.
- Target sentuh minimal 44 × 44 px. Jarak antar target minimal 8 px.
- Semua alur bisa dioperasikan dengan keyboard. Urutan fokus sesuai urutan visual. Fokus terlihat.
- Formulir: label terhubung, galat diumumkan (`aria-live="polite"`), ringkasan galat di atas formulir panjang, tidak mengosongkan isian saat galat.
- Pil stok memakai `role="meter"` dengan teks nilai. Cincin hitung mundur punya teks pengganti.
- Pemindai QR punya jalur kode manual. Pesan hasil dibacakan (`role="status"`).
- Teks dapat diperbesar sampai 200% tanpa kehilangan fungsi. Tidak ada waktu habis yang tak bisa diperpanjang pada formulir.
- Gerak mengikuti `prefers-reduced-motion`.
- Dicek dengan axe dan keyboard sebelum rilis; uji dengan satu pembaca layar (VoiceOver atau TalkBack) pada tiket dan formulir.

---

## 12. Implementasi

### 12.1 Token Tailwind v4 (`globals.css`)

```css
@import "tailwindcss";

@theme {
  /* kosongkan palet bawaan agar tidak ada warna di luar sistem */
  --color-*: initial;

  --color-white: #ffffff;
  --color-transparent: transparent;
  --color-current: currentColor;

  /* palet pamflet */
  --color-brand: #e11d48;
  --color-pink: #f472b6;
  --color-coral: #fb7185;
  --color-apricot: #fdba74;
  --color-blush: #fde1e7;
  --color-canvas: #fff7f9;

  /* turunan */
  --color-brand-strong: #be123c;
  --color-ink: #2b0f17;
  --color-ink-soft: #5c3a44;
  --color-ink-muted: #7a5b65;
  --color-line: #f3d3db;
  --color-line-strong: #e4b4c0;
  --color-field: #9a7480;

  --font-sans: var(--font-jakarta), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-jbmono), ui-monospace, monospace;

  --radius-pill: 9999px;
  --radius-input: 10px;
  --radius-panel: 16px;
  --radius-sheet: 24px;

  --shadow-float: 0 8px 24px rgba(43, 15, 23, 0.12);
}

html { background: var(--color-canvas); color: var(--color-ink); }
body { font-family: var(--font-sans); font-size: 16px; line-height: 1.6; }
h1, h2 { letter-spacing: -0.015em; }

:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--color-brand-strong);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 12.2 Huruf (`app/layout.tsx`)

```tsx
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"], variable: "--font-jakarta", display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"], variable: "--font-jbmono", display: "swap", weight: ["500"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${jakarta.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

### 12.3 StockPill

```tsx
import { Check, TrendingDown, TriangleAlert } from "lucide-react";

type Level = "critical" | "low" | "ok";

const LEVEL = {
  critical: { label: "Kritis",   fill: "bg-brand",   chip: "bg-brand text-white",       Icon: TriangleAlert },
  low:      { label: "Menipis",  fill: "bg-apricot", chip: "bg-apricot text-ink",       Icon: TrendingDown },
  ok:       { label: "Aman",     fill: "bg-pink",    chip: "bg-blush text-ink-soft",    Icon: Check },
} as const;

type Props = {
  group: string;       // tampil: "O−"
  spoken: string;      // dibaca: "O negatif"
  units: number;
  criticalAt: number;
  safeAt: number;
};

export function StockPill({ group, spoken, units, criticalAt, safeAt }: Props) {
  const level: Level = units <= criticalAt ? "critical" : units < safeAt ? "low" : "ok";
  const { label, fill, chip, Icon } = LEVEL[level];
  const max = Math.max(safeAt * 1.5, units, 1);
  const pct = Math.min(100, (units / max) * 100);
  const safePct = Math.min(100, (safeAt / max) * 100);

  return (
    <div className="grid grid-cols-[3.25rem_1fr_6.5rem_auto] items-center gap-3">
      <span className="text-xl font-bold" aria-hidden="true">{group}</span>

      <div
        role="meter"
        aria-label={`Golongan ${spoken}`}
        aria-valuemin={0}
        aria-valuemax={Math.round(max)}
        aria-valuenow={units}
        aria-valuetext={`${units} kantong, ${label.toLowerCase()}`}
        className="relative h-9 rounded-pill border border-line-strong bg-blush"
      >
        <div
          className={`h-full rounded-pill ${fill} motion-safe:transition-[width] motion-safe:duration-500`}
          style={{ width: `${pct}%`, minWidth: "2.25rem" }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-1 w-px bg-ink-soft"
          style={{ left: `${safePct}%` }}
        />
      </div>

      <span className="text-right tabular-nums">
        <span className="font-semibold">{units}</span>{" "}
        <span className="text-sm text-ink-muted">kantong</span>
      </span>

      <span className={`inline-flex h-7 items-center gap-1.5 rounded-pill px-3 text-sm font-semibold ${chip}`}>
        <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
        {label}
      </span>
    </div>
  );
}
```

Di mobile, grid berubah menjadi dua baris: baris pertama golongan + angka + chip, baris kedua pil selebar penuh.

### 12.4 Tombol primer

```tsx
<button className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-5
                   font-semibold text-white hover:bg-brand-strong
                   disabled:bg-blush disabled:text-ink-muted">
  Kirim 18 undangan
</button>
```

---

## 13. Daftar periksa visual sebelum rilis

- [ ] Hanya warna dari token. Tidak ada heks tersebar di komponen.
- [ ] Satu tombol primer per layar.
- [ ] Rose pekat hanya pada status Kritis, tombol primer, dan galat.
- [ ] Tidak ada gradien, blob, emoji, atau foto stok.
- [ ] Setiap status punya kata dan ikon.
- [ ] Tampil benar di 360 px tanpa gulir horizontal (kecuali tabel dalam wadahnya).
- [ ] Nama panjang, angka besar, dan data kosong tidak merusak tata letak.
- [ ] Fokus keyboard terlihat di setiap kontrol.
- [ ] Gerak mati dengan `prefers-reduced-motion`.
- [ ] Semua teks berbahasa Indonesia, nada konsisten, tidak ada lorem ipsum.
- [ ] Banner prototipe dan penegasan "petugas UTD memeriksa ulang" terpasang.
- [ ] Skrin diperiksa di dua peramban (Chrome dan Safari) dan satu ponsel Android.
- [ ] Skor Lighthouse aksesibilitas 95 ke atas, axe tanpa pelanggaran kritis.

---

## 14. Rujukan cepat: boleh dan jangan

| Boleh | Jangan |
|---|---|
| Latar `canvas`, panel putih, batas `line` | Bayangan abu-abu di setiap kartu |
| Pil stok sebagai pusat visual | Dekorasi kapsul di tempat yang tidak membawa data |
| Teks rose `brand-strong` | Teks `brand` (kontras kurang) |
| Status = ikon + kata + warna | Status hanya berupa warna |
| Judul sentence case satu warna | Satu kata diwarnai, ALL CAPS, eyebrow |
| Salinan spesifik ("Kirim 18 undangan") | "Submit", "Selengkapnya", "Mulai sekarang" |
| Gerak singkat yang menjawab aksi | Animasi masuk di setiap bagian |
