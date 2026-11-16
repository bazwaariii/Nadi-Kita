"""Pydantic request and response schemas for Nadi Kita ML service (planning.md Section 10.1)."""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class DonorScoreInput(BaseModel):
    id: str = Field(..., min_length=1)
    lastDonationAt: Optional[str] = None
    firstDonationAt: Optional[str] = None
    donationCount: int = Field(default=0, ge=0)


class ScoreRequest(BaseModel):
    asOf: str
    donors: List[DonorScoreInput] = Field(..., max_length=500)


class ScoreReason(BaseModel):
    feature: str
    text: str
    impact: float


class DonorScoreOutput(BaseModel):
    id: str
    p: float = Field(..., ge=0.0, le=1.0)
    prior: bool
    reasons: List[ScoreReason]


class ScoreResponse(BaseModel):
    modelVersion: str
    scores: List[DonorScoreOutput]

