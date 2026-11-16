"""Feature engineering, collinearity verification, and Indonesian reason mapping for Nadi Kita ML."""

from __future__ import annotations

from datetime import date, datetime
import pathlib
from typing import Any

import numpy as np
import pandas as pd

FEATURE_NAMES = ["recency_months", "log_frequency", "tenure_months", "rate_per_month"]


def parse_iso_date(val: str | date | datetime | None) -> date | None:
    """Parse an ISO-8601 date or datetime string into a date."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    clean = str(val).strip()
    if not clean:
        return None
    if "T" in clean:
        clean = clean.split("T")[0]
    return date.fromisoformat(clean)


def load_and_verify_uci(csv_path: pathlib.Path) -> tuple[pd.DataFrame, dict[str, Any]]:
    """
    Load the UCI Blood Transfusion dataset, verify that Monetary == 250 * Frequency (T9),
    and drop the collinear Monetary column.
    """
    raw = pd.read_csv(csv_path)
    cols = list(raw.columns)
    if len(cols) < 5:
        raise ValueError(f"Expected 5 columns in UCI dataset, got {len(cols)}")

    df = pd.DataFrame(
        {
            "recency": pd.to_numeric(raw.iloc[:, 0], errors="raise").astype(float),
            "frequency": pd.to_numeric(raw.iloc[:, 1], errors="raise").astype(float),
            "monetary": pd.to_numeric(raw.iloc[:, 2], errors="raise").astype(float),
            "tenure": pd.to_numeric(raw.iloc[:, 3], errors="raise").astype(float),
            "target": pd.to_numeric(raw.iloc[:, 4], errors="raise").astype(int),
        }
    )

    monetary_ratio = df["monetary"] / df["frequency"]
    is_exact_250x = bool(np.allclose(df["monetary"], 250.0 * df["frequency"]))
    corr_mf = float(np.corrcoef(df["monetary"], df["frequency"])[0, 1])

    eda_summary = {
        "rows": int(len(df)),
        "positive_count": int(df["target"].sum()),
        "positive_rate": round(float(df["target"].mean()), 4),
        "monetary_equals_250x_frequency": is_exact_250x,
        "monetary_frequency_correlation": round(corr_mf, 6),
        "monetary_ratio_min": float(monetary_ratio.min()),
        "monetary_ratio_max": float(monetary_ratio.max()),
    }

    if not is_exact_250x:
        raise ValueError("Monetary column failed 250 * Frequency verification")

    # Drop Monetary per decision T9
    df = df.drop(columns=["monetary"])
    return df, eda_summary


def build_feature_matrix(
    recency_months: np.ndarray | float,
    frequency: np.ndarray | float,
    tenure_months: np.ndarray | float,
) -> np.ndarray:
    """
    Build the 4-column feature matrix:
    [recency_months, log1p(frequency), tenure_months, frequency / max(tenure_months, 1)]
    """
    r = np.asarray(recency_months, dtype=float)
    f = np.asarray(frequency, dtype=float)
    t = np.maximum(np.asarray(tenure_months, dtype=float), np.maximum(r, 1.0))

    log_f = np.log1p(np.maximum(f, 0.0))
    rate = np.maximum(f, 0.0) / np.maximum(t, 1.0)
    matrix = np.column_stack([r, log_f, t, rate])
    return matrix


def donor_record_to_raw_features(
    as_of: str | date,
    last_donation_at: str | date | None,
    first_donation_at: str | date | None,
    donation_count: int,
) -> tuple[bool, dict[str, float]]:
    """
    Convert a donor record into raw features (recency_months, frequency, tenure_months).
    Returns (is_first_timer, raw_dict).
    """
    as_of_date = parse_iso_date(as_of) or date.today()
    last_date = parse_iso_date(last_donation_at)
    first_date = parse_iso_date(first_donation_at)

    if donation_count <= 0 or last_date is None:
        return True, {
            "recency_months": 0.0,
            "frequency": 0.0,
            "tenure_months": 0.0,
        }

    days_since_last = max(0, (as_of_date - last_date).days)
    recency_months = max(0.5, days_since_last / 30.4375)

    if first_date is not None:
        days_since_first = max(days_since_last, (as_of_date - first_date).days)
        tenure_months = max(recency_months, days_since_first / 30.4375)
    else:
        tenure_months = max(recency_months, recency_months * max(1, donation_count))

    return False, {
        "recency_months": float(recency_months),
        "frequency": float(donation_count),
        "tenure_months": float(tenure_months),
    }


def format_indonesian_reasons(
    raw_features: dict[str, float],
    z_vector: np.ndarray,
    coefs: np.ndarray,
) -> list[dict[str, Any]]:
    """
    Map top 2 feature contributions into fixed, clear Bahasa Indonesia explanations
    as specified in planning.md Section 10.1 & 10.2.
    """
    recency_m = max(1, int(round(raw_features["recency_months"])))
    freq_n = max(1, int(round(raw_features["frequency"])))
    tenure_m = max(recency_m, int(round(raw_features["tenure_months"])))

    # Contributions in log-odds space scaled to approximate probability impact
    contribs = coefs * z_vector

    # Group log_frequency and rate_per_month under "frequency" vs "recency" vs "tenure"
    candidates = [
        {
            "feature": "frequency",
            "text": (
                f"Donor rutin ({freq_n} kali)"
                if freq_n >= 3
                else f"Pernah donor ({freq_n} kali)"
            ),
            "raw_impact": float(contribs[1] + contribs[3]),
            "priority": abs(float(contribs[1] + contribs[3])) + (0.15 if freq_n >= 3 else 0.05),
        },
        {
            "feature": "recency",
            "text": f"Terakhir donor {recency_m} bulan lalu",
            "raw_impact": float(contribs[0]),
            "priority": abs(float(contribs[0])) + 0.10,
        },
        {
            "feature": "tenure",
            "text": f"Aktif berdonor sejak {tenure_m} bulan lalu",
            "raw_impact": float(contribs[2]),
            "priority": abs(float(contribs[2])),
        },
    ]

    # Sort by priority descending, pick top 2
    candidates.sort(key=lambda item: item["priority"], reverse=True)
    top_two = candidates[:2]

    reasons: list[dict[str, Any]] = []
    for item in top_two:
        # Express impact as bounded 2-decimal magnitude for display
        impact_val = round(float(np.tanh(item["raw_impact"] * 0.35)), 2)
        if impact_val == 0.0:
            impact_val = 0.05 if item["raw_impact"] >= 0 else -0.05
        reasons.append(
            {
                "feature": item["feature"],
                "text": item["text"],
                "impact": impact_val,
            }
        )
    return reasons

