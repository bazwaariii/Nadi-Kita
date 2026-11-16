# Sumber Rujukan & Aturan Donor (sources.md)

Tim Kita Peduli · STACK 2026 · Nadi Kita

Dokumen ini mendokumentasikan seluruh sumber rujukan untuk aturan kelayakan donor darah (`EligibilityConfig`), distribusi golongan darah Indonesia, dataset pelatihan model machine learning, dan regulasi pelindungan data pribadi.

---

## 1. Regulasi & Standar Pelayanan Transfusi Darah di Indonesia

1. **Peraturan Menteri Kesehatan Republik Indonesia Nomor 91 Tahun 2015 tentang Standar Pelayanan Transfusi Darah (Permenkes 91/2015)**
   - **Ringkasan Aturan:**
     - Usia donor: 17 hingga 60 tahun (donor pertama kali maksimal 60 tahun; donor ulang dapat sampai 65 tahun dengan perhatian khusus).
     - Berat badan minimum: ≥ 45 kg (untuk pengambilan 350 mL).
     - Kadar hemoglobin (Hb): 12,5 g/dL hingga 17,0 g/dL.
     - Interval waktu sejak donor darah lengkap terakhir: minimal 2 bulan (8 minggu / sekitar 60 hari).
   - **Pemakaian di Nadi Kita:** Disimpan sebagai nilai default di `EligibilityConfig` (`cooldownDays: 60`, `age: { min: 17, max: 60 }`, `minWeightKg: 45`, `minHbGdl: 12.5`) dan dapat dikonfigurasi per cabang UTD tanpa deploy ulang.
   - **Tanggal Akses:** 8 November 2026.

2. **Portal Resmi AYODONOR Palang Merah Indonesia (PMI)**
   - **URL:** https://ayodonor.pmi.or.id/
   - **Ringkasan:** Menyediakan informasi stok darah UTD PMI dan jadwal mobil unit, serta persyaratan dasar calon pendonor darah (sehat jasmani, tidur minimal 4–5 jam sebelum donor, berat badan ≥ 45 kg, kadar Hb ≥ 12,5 g/dL).
   - **Tanggal Akses:** 8 November 2026.

3. **Kementerian Kesehatan RI (Kemenkes) — Kebutuhan Kantong Darah Nasional**
   - **Rujukan:** Laporan Kemenkes RI terkait target kebutuhan darah minimal 2% dari total penduduk (standar WHO, sekitar 5,6 juta kantong per tahun di Indonesia) dan tantangan ketersediaan golongan darah tertentu (terutama Rhesus negatif).
   - **Tanggal Akses:** 8 November 2026.

---

## 2. Dataset Pelatihan Machine Learning

1. **UCI Machine Learning Repository — Blood Transfusion Service Center Data Set**
   - **Penulis / Kontributor:** Prof. I-Cheng Yeh, Department of Information Management, Chung-Hua University, Hsin-Chu, Taiwan (2008).
   - **Kutipan Ilmiah:** Yeh, I-Cheng, Yang, King-Jang, and Ting, Tao-Ming, *"Knowledge discovery on RFM model using Bernoulli sequence"*, Expert Systems with Applications, 2008 (`doi:10.1016/j.eswa.2008.07.018`).
   - **Lisensi:** Creative Commons Attribution 4.0 International (CC BY 4.0).
   - **URL:** https://archive.ics.uci.edu/dataset/176/blood+transfusion+service+center
   - **Karakteristik:** 748 baris donor historis dengan fitur:
     - `Recency` (R): bulan sejak donor terakhir.
     - `Frequency` (F): total jumlah donor.
     - `Monetary` (M): total volume darah dalam c.c. (kolinear penuh karena $M = 250 \times F$, sehingga dibuang pada tahap pra-proses Nadi Kita sesuai T9).
     - `Time` (T): bulan sejak donor pertama kali.
     - `Target`: apakah pendonor mendonorkan darah pada Maret 2007 (1 = ya, 24%; 0 = tidak, 76%).
   - **Tanggal Akses:** 8 November 2026.

---

## 3. Distribusi Golongan Darah untuk Generator Data Sintetis

- **Distribusi ABO Indonesia:** Berdasarkan data agregat populasi Indonesia (O sekitar 36–37%, B sekitar 25–26%, A sekitar 25–26%, AB sekitar 8–9%).
- **Penyesuaian Rhesus Negatif untuk Skenario Simulasi (`isSynthetic = true`):**
  - Di populasi Indonesia nyata, pemilik Rhesus negatif berjumlah kurang dari 1%.
  - Pada generator data sintetis Nadi Kita (320 profil donor di `UTD Simulasi Surabaya`), proporsi diatur menjadi: **A+ 25%, B+ 24%, O+ 33%, AB+ 8%, A− 2,5%, B− 2,5%, O− 3,5%, AB− 1,5%** agar skenario kelangkaan kandidat Rhesus negatif (seperti O− dan AB− pada aturan BR-05) dapat diuji dan didemonstrasikan secara realistis.

---

## 4. Pelindungan Data Pribadi & Etika Uji Coba

1. **Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)**
   - **Relevansi:** Data kesehatan dan riwayat donor termasuk kategori data pribadi spesifik (Pasal 4 ayat (2)).
   - **Penerapan di Nadi Kita:**
     - Seluruh data pada lingkungan demo bersifat sintetis (`isSynthetic = true`) dengan domain email `.test` dan nomor telepon fiktif.
     - Tidak menyimpan Nomor Induk Kependudukan (NIK) atau alamat rumah lengkap.
     - Pendaftaran dan uji coba relawan mewajibkan persetujuan eksplisit (`contactConsent` & `consentAt`) serta menyediakan skrip penghapusan data pasca-acara (`pnpm db:purge-volunteers`).
     - Pemeriksaan awal mandiri selalu disertai penegasan bahwa keputusan medis akhir berada di tangan petugas UTD.

