"""Reconciler: resolves UNKNOWN/PENDING money events by QUERYING PayPal and
re-drives stuck SETTLING jobs. Never re-sends money on its own (the money
guard makes re-driving idempotent)."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.paypal.client import PayPalClient
from app.queue import create_review
from app.repositories import Repos
from app.settlement import SettlementEngine
from app.state_machine import JobState

logger = logging.getLogger("payonpass.reconciler")

STUCK_THRESHOLD_S = 60
SETTLING_THRESHOLD_S = 30


def _age_seconds(doc: Dict[str, Any]) -> float:
    ts = doc.get("created_at")
    if isinstance(ts, datetime):
        return (datetime.now(timezone.utc) - ts).total_seconds()
    try:
        parsed = datetime.fromisoformat(ts)
        return (datetime.now(timezone.utc) - parsed).total_seconds()
    except Exception:
        return 999999.0


async def reconcile_once(repos: Repos, paypal: PayPalClient) -> str:
    """Run one reconciliation pass. Returns a short summary string."""
    summary: List[str] = []

    # 1. Resolve stuck money events by querying PayPal.
    for ev in await repos.money_events.find_stuck(["PENDING", "UNKNOWN"]):
        if _age_seconds(ev) < STUCK_THRESHOLD_S:
            continue
        resolved = await _resolve_stuck_event(repos, paypal, ev)
        if resolved is None:
            continue  # still in flight (PROCESSING/ONHOLD); poll again later
        status, _kind = resolved
        await repos.money_events.mark(ev["job_id"], ev["kind"], status)
        summary.append(f"{ev['kind']}[{ev['job_id']}]->{status}")
        if status == "FAILED":
            reason = {"PAYOUT": "PAYOUT_FAILED", "REFUND": "REFUND_FAILED", "CAPTURE": "CAPTURE_FAILED"}.get(ev["kind"], "MONEY_FAILED")
            await create_review(repos, ev["job_id"], reason)
            await repos.jobs.patch(ev["job_id"], {"state": JobState.NEEDS_REVIEW.value, "review_reason": reason})

    # 2. Re-drive SETTLING jobs that have been idle too long (idempotent).
    settled = SettlementEngine(repos, paypal)
    for job in await repos.jobs.list_by_state(JobState.SETTLING.value):
        if _age_seconds(job) < SETTLING_THRESHOLD_S:
            continue
        try:
            final = await settled.settle(job["_id"])
            if final in (JobState.SETTLED.value, JobState.REFUNDED.value):
                summary.append(f"job[{job['_id']}]->{final}")
        except Exception as e:  # keep the loop alive on a bad job
            logger.exception("reconcile settle %s failed: %s", job["_id"], e)

    return "; ".join(summary)


async def _resolve_stuck_event(repos: Repos, paypal: PayPalClient, ev: Dict[str, Any]) -> Optional[Tuple[str, str]]:
    """Query PayPal for the true status of a stuck money event.
    Returns (job_id, status) => ("SUCCEEDED"|"FAILED", ev.kind) or None if unresolved."""
    kind = ev["kind"]
    ids: List[str] = ev.get("paypal_ids") or []
    resp: Dict[str, Any] = ev.get("response") or {}

    try:
        if kind == "PAYOUT":
            batch_id = ids[0] if ids else resp.get("batch_header", {}).get("payout_batch_id")
            if not batch_id:
                # The request died before a response; the deterministic sender_batch_id
                # lets us look up whether it actually landed.
                found = await paypal.list_payouts(sender_batch_id=f"settle-{ev['job_id']}")
                if not found:
                    return None
                batch_id = found.get("batch_header", {}).get("payout_batch_id")
                if not batch_id:
                    return None
            batch = await paypal.get_payout_batch(batch_id)
            header = batch.get("batch_header", {})
            batch_status = header.get("batch_status")
            items = batch.get("items", [])
            item_status = items[0].get("item_status") if items else None
            if batch_status in ("SUCCESS",) and item_status in ("SUCCESS",):
                return ("SUCCEEDED", "PAYOUT")
            if item_status in ("FAILED", "UNCLAIMED", "RETURNED", "BLOCKED", "CANCELED") or batch_status in ("CANCELED", "FAILED"):
                return ("FAILED", "PAYOUT")
            return None  # PROCESSING / ONHOLD
        if kind == "REFUND":
            refund_id = ids[0] if ids else resp.get("id")
            if not refund_id:
                return None
            refund = await paypal.get_refund(refund_id)
            status = refund.get("status")
            if status == "COMPLETED":
                return ("SUCCEEDED", "REFUND")
            if status in ("CANCELLED", "FAILED"):
                return ("FAILED", "REFUND")
            return None  # PENDING
        if kind == "CAPTURE":
            order_id = resp.get("id") or resp.get("order_id")
            if not order_id:
                return None
            order = await paypal.get_order(order_id)
            status = order.get("status")
            if status == "COMPLETED":
                return ("SUCCEEDED", "CAPTURE")
            if status in ("CREATED",):
                return ("FAILED", "CAPTURE")
            return None
    except Exception as e:
        logger.warning("resolve %s/%s failed: %r", ev["job_id"], kind, e)
        return None
    return None


async def reconciler_loop(repos: Repos, paypal: PayPalClient, interval: float = 30.0):
    while True:
        try:
            summary = await reconcile_once(repos, paypal)
            if summary:
                logger.info("reconciler: %s", summary)
        except Exception:
            logger.exception("reconciler pass failed")
        await asyncio.sleep(interval)