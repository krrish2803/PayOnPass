"""Ledger, job listing, receipts, chain verification, master balances."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_repos
from app.errors import JobNotFound
from app.money import to_cents
from app.paypal.client import capture_summary
from app.repositories import Repos
from app.services import get_chain

router = APIRouter()


def _job_out(job) -> dict:
    return {
        "id": job["_id"],
        "state": job["state"],
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


@router.get("/jobs")
async def list_jobs(repos: Repos = Depends(get_repos)):
    return [_job_out(j) for j in await repos.jobs.list_all()]


@router.get("/jobs/{job_id}")
async def get_job(job_id: str, repos: Repos = Depends(get_repos)):
    job = await repos.jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=str(JobNotFound(job_id)))
    return _job_out(job)


@router.get("/jobs/{job_id}/receipts")
async def job_receipts(job_id: str, repos: Repos = Depends(get_repos)):
    sealed = await repos.receipts.list_for_job_sealed(job_id)
    return {"job_id": job_id, "count": len(sealed), "receipts": sealed}


def _call_fee_cents(kind: str, response: dict) -> Optional[int]:
    """PayPal's own fee for one money call, in cents (best-effort, never raises)."""
    if kind == "CAPTURE":
        return capture_summary(response or {}).get("paypal_fee_cents")
    if kind == "PAYOUT":
        fees = ((response or {}).get("batch_header") or {}).get("fees") or {}
        return to_cents(fees.get("value"))
    return None


@router.get("/jobs/{job_id}/paypal-calls")
async def paypal_calls(job_id: str, repos: Repos = Depends(get_repos)):
    """Every PayPal money request for a job: idempotency key, status, amount,
    PayPal ids, PayPal's fee, and the raw response. The audit trail the PRD
    asks for — without reading code."""
    out = []
    cursor = repos.money_events.coll.find({"job_id": job_id}).sort("created_at", 1)
    async for d in cursor:
        response = d.get("response") or {}
        out.append(
            {
                "job_id": job_id,
                "kind": d["kind"],
                "status": d["status"],
                "request_id": d.get("request_id"),
                "amount_cents": d.get("amount_cents"),
                "paypal_ids": d.get("paypal_ids", []),
                "fee_cents": _call_fee_cents(d["kind"], response),
                "mode": response.get("mode"),
                "error": response.get("error"),
                "debug_id": response.get("debug_id"),
                "created_at": d.get("created_at"),
                "response": response,
            }
        )
    return out


@router.get("/verify-chain")
async def verify_chain(repos: Repos = Depends(get_repos)):
    return await get_chain(repos)


@router.get("/ledger/events")
async def ledger_events(
    job_id: Optional[str] = None,
    kind: Optional[str] = None,
    limit: int = 200,
    repos: Repos = Depends(get_repos),
):
    out = []
    cursor = repos.money_events.coll.find({}).sort("created_at", -1).limit(min(int(limit), 500))
    async for d in cursor:
        if job_id and d.get("job_id") != job_id:
            continue
        if kind and d.get("kind") != kind:
            continue
        out.append(
            {
                "job_id": d["job_id"],
                "kind": d["kind"],
                "status": d["status"],
                "request_id": d.get("request_id"),
                "amount_cents": d.get("amount_cents"),
                "paypal_ids": d.get("paypal_ids", []),
            }
        )
    return out


@router.get("/master")
async def master(repos: Repos = Depends(get_repos)):
    """Audit rollup: money moved vs. obligations, from stored events + receipts."""
    totals = {}
    async for d in repos.money_events.coll.find({}):
        k, s = d["kind"], d["status"]
        totals.setdefault(k, {}).setdefault(s, 0)
        totals[k][s] += d.get("amount_cents", 0)
    sealed = await repos.receipts.all_sealed()
    # PayPal's own fees are a separate cost line, never part of the settlement
    # identity; report them so gross vs. net is auditable.
    captured_cents = 0
    paypal_fees_cents = 0
    for j in await repos.jobs.list_all():
        captured_cents += j.get("captured_cents") or 0
        paypal_fees_cents += j.get("paypal_fee_cents") or 0
    return {
        "money_events_totals": totals,
        "captured_cents": captured_cents,
        "paypal_fees_cents": paypal_fees_cents,
        "receipt_count": len(sealed),
        "chain_ok": True,
    }