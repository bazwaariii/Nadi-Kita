"""Train and calibrate the Nadi Kita donor return-propensity model (return-lr-v1)."""

from __future__ import annotations

from datetime import datetime, timezone
import json
import pathlib
from typing import Any

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import RepeatedStratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

from data.download_uci import ensure_uci_dataset
from src.evaluate import evaluate_predictions
from src.features import FEATURE_NAMES, build_feature_matrix, load_and_verify_uci

ROOT_DIR = pathlib.Path(__file__).resolve().parents[1]
ARTIFACTS_DIR = ROOT_DIR / "artifacts"
DOCS_DIR = ROOT_DIR.parent / "docs"
MODEL_VERSION = "return-lr-v1"
RANDOM_SEED = 20261108


def train_and_export() -> dict[str, Any]:
    """Train, evaluate, calibrate, and export model artifacts and model card."""
    csv_path = ensure_uci_dataset()
    df, eda_summary = load_and_verify_uci(csv_path)

    X = build_feature_matrix(
        df["recency"].to_numpy(),
        df["frequency"].to_numpy(),
        df["tenure"].to_numpy(),
    )
    y = df["target"].to_numpy(dtype=int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=RANDOM_SEED
    )

    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=RANDOM_SEED)

    candidate_models = {
        "logistic_regression": Pipeline(
            [
                ("scaler", StandardScaler()),
                ("clf", LogisticRegression(C=1.0, random_state=RANDOM_SEED)),
            ]
        ),
        "shallow_decision_tree": DecisionTreeClassifier(
            max_depth=3, min_samples_leaf=15, random_state=RANDOM_SEED
        ),
        "gradient_boosting": GradientBoostingClassifier(
            max_depth=2, n_estimators=50, learning_rate=0.08, random_state=RANDOM_SEED
        ),
    }

    cv_comparison: dict[str, Any] = {}
    for name, estimator in candidate_models.items():
        scores = cross_validate(
            estimator,
            X_train,
            y_train,
            cv=cv,
            scoring={
                "roc_auc": "roc_auc",
                "pr_auc": "average_precision",
                "neg_brier": "neg_brier_score",
            },
        )
        cv_comparison[name] = {
            "roc_auc_mean": round(float(np.mean(scores["test_roc_auc"])), 4),
            "roc_auc_std": round(float(np.std(scores["test_roc_auc"])), 4),
            "pr_auc_mean": round(float(np.mean(scores["test_pr_auc"])), 4),
            "brier_mean": round(float(-np.mean(scores["test_neg_brier"])), 4),
        }

    # Fit primary interpretable pipeline (StandardScaler + LogisticRegression)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    base_lr = LogisticRegression(C=1.0, random_state=RANDOM_SEED)
    base_lr.fit(X_train_scaled, y_train)

    # Calibrate with Platt scaling (sigmoid) on 5-fold CV
    calibrated_lr = CalibratedClassifierCV(
        estimator=LogisticRegression(C=1.0, random_state=RANDOM_SEED),
        method="sigmoid",
        cv=5,
    )
    calibrated_lr.fit(X_train_scaled, y_train)

    test_probs = calibrated_lr.predict_proba(X_test_scaled)[:, 1]
    test_metrics = evaluate_predictions(y_test, test_probs)

    trained_at = datetime.now(timezone.utc).isoformat()

    bundle = {
        "model_version": MODEL_VERSION,
        "trained_at": trained_at,
        "feature_names": FEATURE_NAMES,
        "scaler": scaler,
        "base_lr": base_lr,
        "calibrated_lr": calibrated_lr,
        "coefs": base_lr.coef_[0].tolist(),
        "intercept": float(base_lr.intercept_[0]),
        "scaler_mean": scaler.mean_.tolist(),
        "scaler_scale": scaler.scale_.tolist(),
        "first_timer_prior": 0.20,
    }

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, ARTIFACTS_DIR / "model.joblib")

    metrics_payload = {
        "modelVersion": MODEL_VERSION,
        "trainedAt": trained_at,
        "dataset": {
            "name": "UCI Blood Transfusion Service Center Data Set",
            "source": "I-Cheng Yeh (2008), Hsin-Chu City, Taiwan",
            **eda_summary,
            "train_rows": int(len(X_train)),
            "test_rows": int(len(X_test)),
        },
        "features": FEATURE_NAMES,
        "coefficients": {
            feat: round(float(coef), 4)
            for feat, coef in zip(FEATURE_NAMES, base_lr.coef_[0])
        },
        "intercept": round(float(base_lr.intercept_[0]), 4),
        "scaler": {
            "mean": [round(float(x), 4) for x in scaler.mean_],
            "scale": [round(float(x), 4) for x in scaler.scale_],
        },
        "cv_comparison": cv_comparison,
        "test_metrics": test_metrics,
        "firstTimerPrior": 0.20,
    }

    metrics_path = ARTIFACTS_DIR / "metrics.json"
    metrics_path.write_text(json.dumps(metrics_payload, indent=2), encoding="utf-8")

    model_card_text = render_model_card(metrics_payload)
    (ARTIFACTS_DIR / "model_card.md").write_text(model_card_text, encoding="utf-8")
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    (DOCS_DIR / "model_card.md").write_text(model_card_text, encoding="utf-8")

    return metrics_payload


def render_model_card(m: dict[str, Any]) -> str:
    """Render an honest, comprehensive Model Card per planning.md Section 9.1."""
    tm = m["test_metrics"]
    cv_lr = m["cv_comparison"]["logistic_regression"]
    cv_dt = m["cv_comparison"]["shallow_decision_tree"]
    cv_gb = m["cv_comparison"]["gradient_boosting"]
    coefs = m["coefficients"]
    ds = m["dataset"]

    return f"""# Model Card — `{m["modelVersion"]}` (Skor Kecenderungan Kembali Donor)

Tim Kita Peduli · STACK 2026 · Nadi Kita

---

## 1. Detail Model

- **Nama & Versi:** `{m["modelVersion"]}`
- **Arsitektur:** Regresi Logistik (`LogisticRegression`, $C=1.0$) dengan standardisasi fitur (`StandardScaler`) dan kalibrasi probabilitas Platt scaling (`CalibratedClassifierCV`, metode `sigmoid`, 5-fold).
- **Waktu Pelatihan:** `{m["trainedAt"]}`
- **Tujuan Pemakaian:** Mengurutkan prioritas pengiriman undangan bagi calon donor yang **sudah lolos saringan aturan kelayakan deterministik** (`BR-01`).
- **Bukan untuk Keputusan Medis:** Model ini **tidak pernah** dipakai untuk menentukan kelayakan medis atau interval masa jeda donor (`K2`).

---

## 2. Dataset Pelatihan & Pra-proses

- **Sumber:** {ds["name"]} ({ds["source"]}).
- **Ukuran Data:** {ds["rows"]} baris total ({ds["positive_count"]} positif / {ds["positive_rate"] * 100:.1f}% berdonor kembali pada Maret 2007).
- **Pembagian Data:** 80% latih ({ds["train_rows"]} baris) dan 20% uji akhir ({ds["test_rows"]} baris) secara *stratified* (`seed = 20261108`).
- **Verifikasi Kolinearitas (`T9`):**
  - Korelasi `Monetary` dan `Frequency`: `{ds["monetary_frequency_correlation"]}` (`Monetary == 250 * Frequency`: `{ds["monetary_equals_250x_frequency"]}`).
  - Kolom `Monetary` **dibuang** karena redundan penuh.
- **Fitur yang Digunakan:**
  1. `recency_months`: Bulan sejak donor terakhir (koefisien terstandarisasi: `{coefs["recency_months"]}`).
  2. `log_frequency`: $\\ln(1 + \\text{{Frequency}})$ (koefisien terstandarisasi: `{coefs["log_frequency"]}`).
  3. `tenure_months`: Bulan sejak donor pertama kali (koefisien terstandarisasi: `{coefs["tenure_months"]}`).
  4. `rate_per_month`: $\\text{{Frequency}} / \\max(\\text{{Time}}, 1)$ (koefisien terstandarisasi: `{coefs["rate_per_month"]}`).
- **Penanganan Donor Baru (`BR-02`):** Donor tanpa riwayat (`donationCount == 0`) tidak dinilai oleh regresi logistik, melainkan diberi prior tetap `firstTimerPrior = {m["firstTimerPrior"]}` dan penanda `"donor baru"`.

---

## 3. Hasil Evaluasi (Dilaporkan Apa Adanya)

### 3.1 Perbandingan Validasi Silang (Repeated 5-Fold Stratified CV pada 80% Data Latih)

| Model | ROC-AUC (Mean ± SD) | PR-AUC (Mean) | Brier Score (Mean) | Keputusan |
|---|---|---|---|---|
| **Regresi Logistik (Dipilih)** | {cv_lr["roc_auc_mean"]} ± {cv_lr["roc_auc_std"]} | {cv_lr["pr_auc_mean"]} | {cv_lr["brier_mean"]} | Dipilih karena koefisien dapat dijelaskan per fitur dan kinerja kompetitif |
| Pohon Keputusan Dangkal (`max_depth=3`) | {cv_dt["roc_auc_mean"]} ± {cv_dt["roc_auc_std"]} | {cv_dt["pr_auc_mean"]} | {cv_dt["brier_mean"]} | Pembanding non-linear sederhana |
| Gradient Boosting (`max_depth=2`) | {cv_gb["roc_auc_mean"]} ± {cv_gb["roc_auc_std"]} | {cv_gb["pr_auc_mean"]} | {cv_gb["brier_mean"]} | Pembanding ansambel |

### 3.2 Evaluasi pada 20% Data Uji Akhir (Held-out Test Set)

| Metrik | Nilai |
|---|---|
| **ROC-AUC** | `{tm["roc_auc"]}` |
| **PR-AUC** | `{tm["pr_auc"]}` |
| **Brier Score** | `{tm["brier_score"]}` |
| **Lift pada 20% Teratas** | `{tm["lift_top_20pct"]}x` |

### 3.3 Kurva Kalibrasi (5 Kuantil)

- **Rata-rata Probabilitas Prediksi:** `{tm["calibration_curve"]["prob_pred"]}`
- **Fraksi Positif Aktual:** `{tm["calibration_curve"]["prob_true"]}`

---

## 4. Penjelasan Skor (`reasons`)

Untuk setiap donor berulang, kontribusi dihitung dari $\\beta_i \\times z_i$. Dua kontribusi terkuat dipetakan ke templat Bahasa Indonesia tetap:
- `frequency`: *"Donor rutin (N kali)"* atau *"Pernah donor (N kali)"*
- `recency`: *"Terakhir donor M bulan lalu"*
- `tenure`: *"Aktif berdonor sejak T bulan lalu"*

---

## 5. Batasan dan Peringatan Etis (`T1`)

1. **Perbedaan Konteks Populasi:** Dataset berasal dari pusat darah di Hsin-Chu, Taiwan pada tahun 2007, bukan populasi Indonesia tahun 2026.
2. **Definisi Target:** Target pada dataset UCI adalah *"apakah donor mendonorkan darah pada Maret 2007"*, bukan respons langsung terhadap undangan spesifik dari UTD.
3. **Keterbatasan Fitur & Ukuran:** Hanya terdiri dari 748 baris dan 3 variabel perilaku dasar (tanpa golongan darah, usia, jenis kelamin, atau jarak ke lokasi).
4. **Penggunaan yang Diizinkan:** Skor dinamai **skor kecenderungan kembali** dan hanya digunakan sebagai *prior* pengurutan undangan (`prioritas = p * (1 - 0,5 * kelelahan)`). Bila layanan ML tidak tersedia, sistem otomatis beralih ke rumus heuristik deterministik (`planning.md` bagian 10.4).
"""


if __name__ == "__main__":
    result = train_and_export()
    print(
        f"[ml:train] Trained {result['modelVersion']} | "
        f"Test ROC-AUC={result['test_metrics']['roc_auc']} | "
        f"PR-AUC={result['test_metrics']['pr_auc']} | "
        f"Brier={result['test_metrics']['brier_score']} | "
        f"Lift@20%={result['test_metrics']['lift_top_20pct']}x"
    )

