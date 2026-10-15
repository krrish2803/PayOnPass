"""Human review queue + decision routes."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_paypal, get_repos
from app.errors import IllegalTransition, JobNotFound
from app.models import ReviewDecisionRequest
from app.paypal.client import PayPalClient
from app.repositories import Repos
from app.services import decide_review

router = APIRouter()


@router.get("/reviews")
async def list_reviews(repos: Repos = Depends(get_repos)):
    items = await repos.reviews.list_open()
    return [
        {
            "job_id": r["job_id"],
            "reason": r.get("reason"),
            "created_at": r.get("created_at"),
            "status": r.get("status"),
        }
        for r in items
    ]


@router.post("/review/{job_id}/decide")
async def decide(
    job_id: str,
    req: ReviewDecisionRequest,
    repos: Repos = Depends(get_repos),
    paypal: PayPalClient = Depends(get_paypal),
):
    try:
        return await decide_review(repos, paypal, job_id, req.decision, req.score_bp, req.note)
    except IllegalTransition as e:
        raise HTTPException(status_code=409, detail=str(e))
    except JobNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))