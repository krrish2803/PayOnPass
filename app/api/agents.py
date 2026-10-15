"""Agent API: keyed access so worker agents can create, fund (prefunded) and
submit jobs without a human in the loop. Demo mode default. Live funding still
returns the approval URL for a human to click."""

from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, Header, HTTPException

from app.api.deps import get_llm, get_paypal, get_repos
from app.config import settings
from app.errors import GuardrailRejected, IllegalTransition, MatrixValidationError
from app.llm.provider import LLMClient
from app.models import CreateJobRequest, SubmitDeliverableRequest
from app.paypal.client import PayPalClient
from app.repositories import Repos
from app.services import create_job, fund_job, submit_deliverable

router = APIRouter(prefix="/api/v1/agent")


def _require_key(x_api_key: str | None = Header(None)):
    keys = settings.agent_keys
    if not keys:
        return
    if not x_api_key or not any(secrets.compare_digest(x_api_key, k) for k in keys):
        raise HTTPException(status_code=401, detail="invalid or missing X-API-Key")


@router.post("/jobs", dependencies=[Depends(_require_key)], status_code=201)
async def agent_create_job(req: CreateJobRequest, repos: Repos = Depends(get_repos), llm: LLMClient = Depends(get_llm)):
    try:
        job = await create_job(
            repos,
            llm,
            req.prompt,
            req.price_cents or 2000,
            req.worker_email or "sandbox-worker@example.com",
            title=req.title,
            worker_kind=req.worker_kind or "agent",
            buyer_ref=req.buyer_ref,
        )
    except GuardrailRejected as e:
        raise HTTPException(status_code=422, detail=f"GUARDRAIL_REJECTED: {e}")
    except MatrixValidationError as e:
        raise HTTPException(status_code=422, detail=f"MATRIX_INVALID: {e}")
    return {
        "job_id": job["_id"],
        "state": job["state"],
        "price_cents": job["price_cents"],
        "matrix": job["matrix"],
        "matrix_source": job["matrix_source"],
        "funding": {"mode": settings.FUNDING_MODE},
    }


@router.post("/jobs/{job_id}/fund", dependencies=[Depends(_require_key)])
async def agent_fund(job_id: str, repos: Repos = Depends(get_repos), paypal: PayPalClient = Depends(get_paypal)):
    try:
        return await fund_job(repos, paypal, job_id)
    except IllegalTransition as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post("/jobs/{job_id}/submit", dependencies=[Depends(_require_key)])
async def agent_submit(
    job_id: str,
    req: SubmitDeliverableRequest,
    repos: Repos = Depends(get_repos),
    llm: LLMClient = Depends(get_llm),
    paypal: PayPalClient = Depends(get_paypal),
):
    try:
        return await submit_deliverable(repos, llm, paypal, job_id, req.content, req.submitted_by or "agent")
    except IllegalTransition as e:
        raise HTTPException(status_code=409, detail=str(e))