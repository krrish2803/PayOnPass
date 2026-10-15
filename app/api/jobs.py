"""Core job lifecycle routes (create -> fund -> return/capture -> submit)."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_llm, get_paypal, get_repos
from app.errors import GuardrailRejected, IllegalTransition, JobNotFound, MatrixValidationError
from app.llm.provider import LLMClient
from app.models import CreateJobRequest, FundResponse, SubmitDeliverableRequest
from app.paypal.client import PayPalClient
from app.repositories import Repos
from app.services import confirm_capture, create_job, fund_job, submit_deliverable

logger = logging.getLogger("payonpass.api")

router = APIRouter()


def _job_out(job) -> dict:
    return {
        "id": job["_id"],
        "state": job["state"],
        "review_reason": job.get("review_reason"),
        "title": job.get("title"),
        "prompt": job.get("prompt"),
        "price_cents": job.get("price_cents"),
        "currency": job.get("currency"),
        "matrix": job.get("matrix"),
        "worker_email": job.get("worker_email"),
        "worker_kind": job.get("worker_kind"),
        "matrix_source": job.get("matrix_source"),
        "paypal": job.get("paypal", {}),
        "captured_cents": job.get("captured_cents"),
        "paypal_fee_cents": job.get("paypal_fee_cents"),
        "version": job.get("version", 1),
        "created_at": job.get("created_at"),
        "updated_at": job.get("updated_at"),
    }


@router.post("/jobs", status_code=201)
async def post_job(
    req: CreateJobRequest,
    repos: Repos = Depends(get_repos),
    llm: LLMClient = Depends(get_llm),
    paypal: PayPalClient = Depends(get_paypal),
):
    try:
        job = await create_job(
            repos,
            llm,
            req.prompt,
            req.price_cents or 2000,
            req.worker_email or "sandbox-worker@example.com",
            title=req.title,
            worker_kind=req.worker_kind or "human",
            buyer_ref=req.buyer_ref,
        )
    except GuardrailRejected as e:
        raise HTTPException(status_code=422, detail=f"GUARDRAIL_REJECTED: {e}")
    except MatrixValidationError as e:
        raise HTTPException(status_code=422, detail=f"MATRIX_INVALID: {e}")
    return _job_out(job)


@router.post("/jobs/{job_id}/fund", response_model=FundResponse)
async def fund(
    job_id: str,
    repos: Repos = Depends(get_repos),
    paypal: PayPalClient = Depends(get_paypal),
):
    try:
        return await fund_job(repos, paypal, job_id)
    except IllegalTransition as e:
        raise HTTPException(status_code=409, detail=str(e))
    except JobNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/paypal/return")
async def paypal_return(
    job_id: str,
    token: str | None = None,
    repos: Repos = Depends(get_repos),
    paypal: PayPalClient = Depends(get_paypal),
):
    try:
        return await confirm_capture(repos, paypal, job_id)
    except IllegalTransition as e:
        raise HTTPException(status_code=409, detail=str(e))
    except JobNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/paypal/cancel")
async def paypal_cancel(job_id: str):
    return {"job_id": job_id, "state": "CANCELLED", "detail": "Buyer cancelled checkout; no capture performed."}


@router.post("/jobs/{job_id}/submit")
async def submit(
    job_id: str,
    req: SubmitDeliverableRequest,
    repos: Repos = Depends(get_repos),
    llm: LLMClient = Depends(get_llm),
    paypal: PayPalClient = Depends(get_paypal),
):
    try:
        return await submit_deliverable(repos, llm, paypal, job_id, req.content, req.submitted_by)
    except IllegalTransition as e:
        raise HTTPException(status_code=409, detail=str(e))
    except JobNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception("submit failed for %s", job_id)
        raise HTTPException(status_code=422, detail=f"VERIFY_ERROR: {e}")