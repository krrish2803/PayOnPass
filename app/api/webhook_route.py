"""PayPal webhook ingestion.

Signature is verified against PayPal; the event_id UNIQUE guard dedupes replays.
Webhooks are the enhancment path (reconciler already covers the same ground by
polling); they mark money events SUCCEEDED and re-drive stuck SETTLING jobs.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.deps import get_paypal, get_repos
from app.paypal.client import PayPalClient
from app.paypal.webhooks import WebhookVerifier
from app.repositories import Repos
from app.settlement import SettlementEngine

router = APIRouter()


@router.post("/webhooks/paypal")
async def paypal_webhook(request: Request, repos: Repos = Depends(get_repos), paypal: PayPalClient = Depends(get_paypal)):
    payload = await request.body()
    try:
        event = json.loads(payload)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid JSON")

    event_id = event.get("id")
    if not event_id:
        raise HTTPException(status_code=400, detail="missing event id")

    verifier = WebhookVerifier(paypal)
    verified = await verifier.verify(
        webhook_event=event,
        transmission_id=request.headers.get("Paypal-Transmission-Id", ""),
        transmission_time=request.headers.get("Paypal-Transmission-Time", ""),
        transmission_sig=request.headers.get("Paypal-Transmission-Sig", ""),
        cert_url=request.headers.get("Paypal-Cert-Url", ""),
        auth_algo=request.headers.get("Paypal-Auth-Algo", ""),
    )

    first_seen = await repos.webhook_events.remember(event_id, event.get("event_type", "?"), verified, event)
    if not first_seen:
        return {"ok": True, "duplicate": True}

    if not verified:
        return {"ok": False, "verified": False, "reason": "signature verification failed"}

    handled = await _apply_event(repos, paypal, event)
    return {"ok": True, "verified": True, "handled": handled}


def _job_from_resource(resource: dict) -> str | None:
    """Resolve the job_id carried by a webhook resource, across event shapes."""
    for field in ("custom_id", "reference_id", "sender_item_id", "invoice_id"):
        if resource.get(field):
            return resource[field]
    # Payout items carry sender_batch_id = "settle-<job_id>".
    batch = resource.get("sender_batch_id") or (resource.get("batch_header") or {}).get("sender_batch_id")
    if batch and str(batch).startswith("settle-"):
        return str(batch)[len("settle-"):]
    # Order events (CHECKOUT.ORDER.*) carry custom_id inside purchase_units.
    for pu in resource.get("purchase_units") or []:
        if pu.get("custom_id"):
            return pu["custom_id"]
    related = (resource.get("supplementary_data") or {}).get("related_ids") or {}
    return related.get("order_id")


async def _apply_event(repos: Repos, paypal: PayPalClient, event) -> list:
    etype = event.get("event_type", "")
    resource = event.get("resource", {})
    handled = []

    job_id = _job_from_resource(resource)

    # Real PayPal webhook event names (docs: webhook event names).
    kind = None
    fail_reason = None
    if etype == "PAYMENT.CAPTURE.COMPLETED" and job_id:
        kind = "CAPTURE"
    elif etype in ("PAYMENT.PAYOUTSBATCH.SUCCESS", "PAYMENT.PAYOUTS-ITEM.SUCCEEDED") and job_id:
        kind = "PAYOUT"
    elif etype == "PAYMENT.CAPTURE.REFUNDED" and job_id:
        kind = "REFUND"
    elif etype == "PAYMENT.PAYOUTS-ITEM.FAILED" and job_id:
        kind = "PAYOUT"
        fail_reason = "PAYOUT_FAILED"
    elif etype == "PAYMENT.CAPTURE.DENIED" and job_id:
        kind = "CAPTURE"
        fail_reason = "CAPTURE_FAILED"
    elif etype == "CHECKOUT.ORDER.APPROVED" and job_id:
        # Buyer approved; the capture is driven by the return URL / reconciler.
        handled.append(f"ORDER_APPROVED:{job_id}")
        return handled

    if kind and job_id:
        if fail_reason:
            await repos.money_events.mark(job_id, kind, "FAILED",
                                          paypal_ids=[resource.get("id")] if resource.get("id") else None,
                                          response=resource)
            await _park_for_review(repos, job_id, fail_reason)
        else:
            await repos.money_events.mark(job_id, kind, "SUCCEEDED",
                                          paypal_ids=[resource.get("id")] if resource.get("id") else None,
                                          response=resource)
        handled.append(f"{kind}:{job_id}")
        # Push any stuck SETTLING job forward (idempotent).
        job = await repos.jobs.get(job_id)
        if job and job.get("state") == "SETTLING":
            try:
                await SettlementEngine(repos, paypal).settle(job_id)
            except Exception:
                pass

    return handled


async def _park_for_review(repos: Repos, job_id: str, reason: str) -> None:
    from app.services import create_review

    await create_review(repos, job_id, reason)
    job = await repos.jobs.get(job_id)
    if job and job.get("state") not in ("SETTLED", "NEEDS_REVIEW"):
        await repos.jobs.patch(job_id, {"state": "NEEDS_REVIEW", "review_reason": reason})