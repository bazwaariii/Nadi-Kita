# Model Card — `return-lr-v1` (Skor Kecenderungan Kembali Donor)

Tim Kita Peduli · STACK 2026 · Nadi Kita

---

## 1. Detail Model

- **Nama & Versi:** `return-lr-v1`
- **Arsitektur:** Regresi Logistik (`LogisticRegression`, $C=1.0$) dengan standardisasi fitur (`StandardScaler`) dan kalibrasi probabilitas Platt scaling (`CalibratedClassifierCV`, metode `sigmoid`, 5-fold).
- **Waktu Pelatihan:** `2026-11-15T13:46:42.007678+00:00`
- **Tujuan Pemakaian:** Mengurutkan prioritas pengiriman undangan bagi calon donor yang **sudah lolos saringan aturan kelayakan deterministik** (`BR-01`).
- **Bukan untuk Keputusan Medis:** Model ini **tidak pernah** dipakai untuk menentukan kelayakan medis atau interval masa jeda donor (`K2`).

---

## 2. Dataset Pelatihan & Pra-proses

- **Sumber:** UCI Blood Transfusion Service Center Data Set (I-Cheng Yeh (2008), Hsin-Chu City, Taiwan).
- **Ukuran Data:** 748 baris total (178 positif / 23.8% berdonor kembali pada Maret 2007).
- **Pembagian Data:** 80% latih (598 baris) dan 20% uji akhir (150 baris) secara *stratified* (`seed = 20261108`).
- **Verifikasi Kolinearitas (`T9`):**
  - Korelasi `Monetary` dan `Frequency`: `1.0` (`Monetary == 250 * Frequency`: `True`).
  - Kolom `Monetary` **dibuang** karena redundan penuh.
- **Fitur yang Digunakan:**
  1. `recency_months`: Bulan sejak donor terakhir (koefisien terstandarisasi: `-1.3714`).
  2. `log_frequency`: $\ln(1 + \text{Frequency})$ (koefisien terstandarisasi: `0.674`).
  3. `tenure_months`: Bulan sejak donor pertama kali (koefisien terstandarisasi: `-0.5899`).
  4. `rate_per_month`: $\text{Frequency} / \max(\text{Time}, 1)$ (koefisien terstandarisasi: `0.0457`).
- **Penanganan Donor Baru (`BR-02`):** Donor tanpa riwayat (`donationCount == 0`) tidak dinilai oleh regresi logistik, melainkan diberi prior tetap `firstTimerPrior = 0.2` dan penanda `"donor baru"`.

---

## 3. Hasil Evaluasi (Dilaporkan Apa Adanya)

### 3.1 Perbandingan Validasi Silang (Repeated 5-Fold Stratified CV pada 80% Data Latih)

| Model | ROC-AUC (Mean ± SD) | PR-AUC (Mean) | Brier Score (Mean) | Keputusan |
|---|---|---|---|---|
| **Regresi Logistik (Dipilih)** | 0.7853 ± 0.0271 | 0.523 | 0.149 | Dipilih karena koefisien dapat dijelaskan per fitur dan kinerja kompetitif |
| Pohon Keputusan Dangkal (`max_depth=3`) | 0.7756 ± 0.0378 | 0.4783 | 0.1498 | Pembanding non-linear sederhana |
| Gradient Boosting (`max_depth=2`) | 0.7706 ± 0.0298 | 0.4798 | 0.1527 | Pembanding ansambel |

### 3.2 Evaluasi pada 20% Data Uji Akhir (Held-out Test Set)

| Metrik | Nilai |
|---|---|
| **ROC-AUC** | `0.7111` |
| **PR-AUC** | `0.3863` |
| **Brier Score** | `0.1663` |
| **Lift pada 20% Teratas** | `1.6667x` |

### 3.3 Kurva Kalibrasi (5 Kuantil)

- **Rata-rata Probabilitas Prediksi:** `[0.049, 0.1246, 0.2257, 0.3684, 0.4851]`
- **Fraksi Positif Aktual:** `[0.0, 0.1724, 0.2333, 0.4, 0.4]`

---

## 4. Penjelasan Skor (`reasons`)

Untuk setiap donor berulang, kontribusi dihitung dari $\beta_i \times z_i$. Dua kontribusi terkuat dipetakan ke templat Bahasa Indonesia tetap:
- `frequency`: *"Donor rutin (N kali)"* atau *"Pernah donor (N kali)"*
- `recency`: *"Terakhir donor M bulan lalu"*
- `tenure`: *"Aktif berdonor sejak T bulan lalu"*

---

## 5. Batasan dan Peringatan Etis (`T1`)

1. **Perbedaan Konteks Populasi:** Dataset berasal dari pusat darah di Hsin-Chu, Taiwan pada tahun 2007, bukan populasi Indonesia tahun 2026.
2. **Definisi Target:** Target pada dataset UCI adalah *"apakah donor mendonorkan darah pada Maret 2007"*, bukan respons langsung terhadap undangan spesifik dari UTD.
3. **Keterbatasan Fitur & Ukuran:** Hanya terdiri dari 748 baris dan 3 variabel perilaku dasar (tanpa golongan darah, usia, jenis kelamin, atau jarak ke lokasi).
4. **Penggunaan yang Diizinkan:** Skor dinamai **skor kecenderungan kembali** dan hanya digunakan sebagai *prior* pengurutan undangan (`prioritas = p * (1 - 0,5 * kelelahan)`). Bila layanan ML tidak tersedia, sistem otomatis beralih ke rumus heuristik deterministik (`planning.md` bagian 10.4).
