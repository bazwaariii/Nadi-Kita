"""Evaluation utilities for the Nadi Kita return-propensity model."""

from __future__ import annotations

from typing import Any
import numpy as np
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    roc_auc_score,
)


def compute_lift_at_k(y_true: np.ndarray, y_prob: np.ndarray, top_fraction: float = 0.20) -> float:
    """Compute lift in the top_fraction (default 20%) predicted probability bucket."""
    y_true_arr = np.asarray(y_true, dtype=float)
    y_prob_arr = np.asarray(y_prob, dtype=float)
    base_rate = float(np.mean(y_true_arr))
    if base_rate <= 0.0:
        return 1.0
    k = max(1, int(round(len(y_true_arr) * top_fraction)))
    top_idx = np.argsort(y_prob_arr)[::-1][:k]
    top_rate = float(np.mean(y_true_arr[top_idx]))
    return top_rate / base_rate


def evaluate_predictions(y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 5) -> dict[str, Any]:
    """Compute ROC-AUC, PR-AUC, Brier score, Lift@20%, and calibration curve."""
    y_true_arr = np.asarray(y_true, dtype=int)
    y_prob_arr = np.clip(np.asarray(y_prob, dtype=float), 1e-6, 1.0 - 1e-6)

    roc_auc = float(roc_auc_score(y_true_arr, y_prob_arr))
    pr_auc = float(average_precision_score(y_true_arr, y_prob_arr))
    brier = float(brier_score_loss(y_true_arr, y_prob_arr))
    lift20 = float(compute_lift_at_k(y_true_arr, y_prob_arr, 0.20))

    prob_true, prob_pred = calibration_curve(
        y_true_arr, y_prob_arr, n_bins=n_bins, strategy="quantile"
    )

    return {
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "brier_score": round(brier, 4),
        "lift_top_20pct": round(lift20, 4),
        "calibration_curve": {
            "prob_pred": [round(float(x), 4) for x in prob_pred],
            "prob_true": [round(float(x), 4) for x in prob_true],
        },
    }

