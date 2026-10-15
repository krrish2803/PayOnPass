"""Idempotent money wrapper.

Before ANY PayPal money call we insert a PENDING money_events row guarded by the
UNIQUE {job_id, kind} index. If that insert collides, the call is a replay:
we read the stored result and never call PayPal again.

Outcomes stored on the row:
- SUCCEEDED  after a confirmed response
- FAILED     on a permanent 4xx (job goes to review)
- UNKNOWN    after a timeout/transient failure past retries (reconciler queries
             PayPal to resolve; never a blind retry)
"""

from __future__ import annotations

import logging
from typing import Any, Awaitable, Callable, Dict, List, Optional

from pymongo.errors import DuplicateKeyError

from app.errors import PayPalPermanentError, PayPalTransientError
from app.money import request_id
from app.repositories import Repos

logger = logging.getLogger("payonpass.moneyflow")


async def guarded_money_call(
    repos: Repos,
    job_id: str,
    kind: str,  # CAPTURE | PAYOUT | REFUND
    amount_cents: int,
    call: Callable[[str], Awaitable[Dict[str, Any]]],
    paypal_ids: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Runs one PayPal money call exactly once per {job_id, kind}.
    Returns the money_events document.
    """
    rid = request_id(job_id, kind.lower())
    try:
        await repos.money_events.insert_pending(job_id, kind, amount_cents, rid)
        created = True
    except DuplicateKeyError:
        # Replay: the guard index blocked a second call. Read the stored result.
        existing = await repos.money_events.get(job_id, kind)
        logger.info("money replay blocked for %s/%s -> %s", job_id, kind, existing["status"])
        return existing

    try:
        response = await call(rid)
        await repos.money_events.mark(
            job_id,
            kind,
            "SUCCEEDED",
            paypal_ids=paypal_ids or _extract_ids(kind, response),
            response=response,
        )
    except PayPalPermanentError as e:
        await repos.money_events.mark(
            job_id, kind, "FAILED", response={"error": str(e), "debug_id": e.debug_id}
        )
        logger.error("permanent PayPal failure %s/%s: %s", job_id, kind, e)
    except PayPalTransientError as e:
        # A definite HTTP 429/5xx response: the job is sent to review, never auto-settled.
        if e.status_code > 0:
            await repos.money_events.mark(
                job_id, kind, "FAILED", response={"error": str(e), "debug_id": e.debug_id}
            )
            logger.error("PayPal %s after retries %s/%s: %s", e.status_code, job_id, kind, e)
        else:
            # Transport-level ambiguity (timeout/connection): the request may have been
            # applied. Leave UNKNOWN for the reconciler, which queries PayPal for truth.
            await repos.money_events.mark(
                job_id, kind, "UNKNOWN", response={"error": str(e), "debug_id": e.debug_id}
            )
            logger.error("transport failure %s/%s: %s", job_id, kind, e)
    return await repos.money_events.get(job_id, kind)


def _extract_ids(kind: str, response: Dict[str, Any]) -> List[str]:
    if kind == "PAYOUT":
        ids = []
        batch = response.get("batch_header", {}).get("payout_batch_id")
        if batch:
            ids.append(batch)
        for item in response.get("items", []):
            if item.get("payout_item_id"):
                ids.append(item["payout_item_id"])
        return ids
    if kind == "REFUND":
        rid = response.get("id")
        return [rid] if rid else []
    if kind == "CAPTURE":
        from app.paypal.client import extract_capture_ids

        return extract_capture_ids(response)
    return []