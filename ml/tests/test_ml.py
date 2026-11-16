"""Unit and API contract tests for the Nadi Kita ML pipeline and FastAPI service (planning.md Section 10.3)."""

from __future__ import annotations

from fastapi.testclient import TestClient
import numpy as np

from data.download_uci import ensure_uci_dataset
from service.main import app
from src.features import build_feature_matrix, load_and_verify_uci
from src.seed.generate import generate_synthetic_dataset
from src.train import train_and_export

client = TestClient(app)
SERVICE_KEY = "dev-ml-service-key-2026"


def test_uci_collinearity_and_monetary_drop() -> None:
    csv_path = ensure_uci_dataset()
    df, summary = load_and_verify_uci(csv_path)
    assert summary["rows"] == 748
    assert summary["monetary_equals_250x_frequency"] is True
    assert "monetary" not in df.columns
    assert list(df.columns) == ["recency", "frequency", "tenure", "target"]


def test_feature_matrix_shape_and_values() -> None:
    X = build_feature_matrix(
        recency_months=np.array([2.0, 6.0]),
        frequency=np.array([1.0, 5.0]),
        tenure_months=np.array([2.0, 24.0]),
    )
    assert X.shape == (2, 4)
    assert np.isclose(X[0, 1], np.log1p(1.0))
    assert np.isclose(X[1, 3], 5.0 / 24.0)


def test_training_and_calibration_bounds() -> None:
    metrics = train_and_export()
    assert metrics["modelVersion"] == "return-lr-v1"
    tm = metrics["test_metrics"]
    assert 0.5 <= tm["roc_auc"] <= 1.0
    assert 0.0 <= tm["brier_score"] <= 0.5
    assert tm["lift_top_20pct"] > 1.0


def test_score_endpoint_contract_and_monotonicity() -> None:
    # Unauthorized without X-Service-Key
    unauth = client.post(
        "/v1/score",
        json={"asOf": "2026-11-20", "donors": []},
    )
    assert unauth.status_code == 401

    payload = {
        "asOf": "2026-11-20",
        "donors": [
            {
                "id": "dnr_active_frequent",
                "lastDonationAt": "2026-08-20",
                "firstDonationAt": "2025-05-20",
                "donationCount": 7,
            },
            {
                "id": "dnr_stale_infrequent",
                "lastDonationAt": "2024-05-20",
                "firstDonationAt": "2023-05-20",
                "donationCount": 1,
            },
            {
                "id": "dnr_first_timer",
                "lastDonationAt": None,
                "firstDonationAt": None,
                "donationCount": 0,
            },
        ],
    }

    resp = client.post(
        "/v1/score",
        headers={"X-Service-Key": SERVICE_KEY},
        json=payload,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["modelVersion"] == "return-lr-v1"
    scores = {item["id"]: item for item in body["scores"]}

    # Calibration in [0, 1]
    for item in body["scores"]:
        assert 0.0 <= item["p"] <= 1.0

    # First timer gets prior 0.20 and empty reasons (BR-02 & 10.1)
    first_timer = scores["dnr_first_timer"]
    assert first_timer["prior"] is True
    assert np.isclose(first_timer["p"], 0.20)
    assert first_timer["reasons"] == []

    # Repeat donor gets prior=False and top 2 Indonesian reasons
    active = scores["dnr_active_frequent"]
    stale = scores["dnr_stale_infrequent"]
    assert active["prior"] is False
    assert len(active["reasons"]) == 2
    assert any("Donor rutin" in r["text"] for r in active["reasons"])

    # Monotonicity: recent frequent donor scores higher than stale 1-time donor
    assert active["p"] > stale["p"]


def test_synthetic_generator_reproducibility() -> None:
    d1 = generate_synthetic_dataset()
    d2 = generate_synthetic_dataset()
    assert len(d1["donors"]) == 320
    assert len(d1["volunteers"]) == 15
    assert d1["donors"][0]["fullName"] == d2["donors"][0]["fullName"]

