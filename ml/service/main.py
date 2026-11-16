"""FastAPI service exposing POST /v1/score, GET /health, and GET /v1/model."""

from __future__ import annotations

import json
import os
import pathlib
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, status
import joblib
import numpy as np

from service.schemas import DonorScoreOutput, ScoreReason, ScoreRequest, ScoreResponse
from src.features import (
    build_feature_matrix,
    donor_record_to_raw_features,
    format_indonesian_reasons,
)
from src.train import train_and_export

ROOT_DIR = pathlib.Path(__file__).resolve().parents[1]
ARTIFACTS_DIR = ROOT_DIR / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "model.joblib"
METRICS_PATH = ARTIFACTS_DIR / "metrics.json"

app = FastAPI(
    title="Nadi Kita ML Service",
    version="1.0.0",
    description="Donor return-propensity scoring service (return-lr-v1) for Nadi Kita.",
)

_MODEL_CACHE: dict[str, Any] | None = None
_METRICS_CACHE: dict[str, Any] | None = None


def get_model_bundle() -> tuple[dict[str, Any], dict[str, Any]]:
    """Load model and metrics into memory, training first if artifacts are missing."""
    global _MODEL_CACHE, _METRICS_CACHE
    if _MODEL_CACHE is None or _METRICS_CACHE is None:
        if not MODEL_PATH.exists() or not METRICS_PATH.exists():
            train_and_export()
        _MODEL_CACHE = joblib.load(MODEL_PATH)
        _METRICS_CACHE = json.loads(METRICS_PATH.read_text(encoding="utf-8"))
    return _MODEL_CACHE, _METRICS_CACHE


def verify_service_key(
    x_service_key: str | None = Header(default=None, alias="X-Service-Key"),
) -> None:
    """Validate X-Service-Key header per planning.md Section 10.1."""
    expected = os.environ.get("ML_SERVICE_KEY", "dev-ml-service-key-2026")
    if not x_service_key or x_service_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-Service-Key tidak sah atau belum disertakan.",
        )


@app.get("/health")
def health_check() -> dict[str, Any]:
    bundle, _ = get_model_bundle()
    return {
        "status": "ok",
        "modelVersion": bundle["model_version"],
    }


@app.get("/v1/model")
def model_info() -> dict[str, Any]:
    _, metrics = get_model_bundle()
    return metrics


@app.post(
    "/v1/score",
    response_model=ScoreResponse,
    dependencies=[Depends(verify_service_key)],
)
def score_donors(payload: ScoreRequest) -> ScoreResponse:
    bundle, _ = get_model_bundle()
    scaler = bundle["scaler"]
    calibrated_lr = bundle["calibrated_lr"]
    coefs = np.asarray(bundle["coefs"], dtype=float)
    first_timer_prior = float(bundle.get("first_timer_prior", 0.20))

    outputs: list[DonorScoreOutput] = []

    for donor in payload.donors:
        is_first_timer, raw_feat = donor_record_to_raw_features(
            as_of=payload.asOf,
            last_donation_at=donor.lastDonationAt,
            first_donation_at=donor.firstDonationAt,
            donation_count=donor.donationCount,
        )

        if is_first_timer:
            outputs.append(
                DonorScoreOutput(
                    id=donor.id,
                    p=round(first_timer_prior, 4),
                    prior=True,
                    reasons=[],
                )
            )
            continue

        X_row = build_feature_matrix(
            raw_feat["recency_months"],
            raw_feat["frequency"],
            raw_feat["tenure_months"],
        )
        z_row = scaler.transform(X_row)
        prob = float(calibrated_lr.predict_proba(z_row)[0, 1])
        prob_clamped = round(float(np.clip(prob, 0.01, 0.99)), 4)

        reasons_dicts = format_indonesian_reasons(raw_feat, z_row[0], coefs)
        reasons = [ScoreReason(**r) for r in reasons_dicts]

        outputs.append(
            DonorScoreOutput(
                id=donor.id,
                p=prob_clamped,
                prior=False,
                reasons=reasons,
            )
        )

    return ScoreResponse(
        modelVersion=bundle["model_version"],
        scores=outputs,
    )

