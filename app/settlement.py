"""Settlement engine — the ONLY module that moves money.

Invariants:
- Runs only from SETTLING.
- Seals a settlement receipt BEFORE any PayPal money call.
- A failed money call sends the job to NEEDS_REVIEW (never SETTLED).
- SETTLED/REFUNDED is set only when every required money event is SUCCEEDED.
- Replays are safe: the money_events UNIQUE guard blocks a second call.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict

from pymongo.errors import DuplicateKeyError

from app.errors import JobNotFound
from app.moneyflow import guarded_money_call
from app.paypal.client import PayPalClient
from app.queue import create_review, utcnow
from app.repositories import Repos
from app.state_machine import JobState
from app.config import settings

logger = logging.getLogger("payonpass.settlement")


def _mock_payload(kind: str, job_id: str) -> Dict[str, Any]:
    """Shape like a real PayPal response so the capture/payout/refund paths are uniform.

    The `mode: "prefunded"` marker is persisted on the money event so the ledger
    never pretends simulated money was real.
    """
    if kind == "PAYOUT":
        return {
            "mode": "prefunded",
            "batch_header": {"payout_batch_id": f"prefunded-payout-{job_id}"},
            "items": [{"payout_item_id": f"prefunded-item-{job_id}"}],
        }
    if kind == "REFUND":
        return {"mode": "prefunded", "id": f"prefunded-refund-{job_id}"}
    return {"mode": "prefunded", "id": f"prefunded-capture-{job_id}"}


class SettlementEngine:
    def __init__(self, repos: Repos, paypal: PayPalClient):
        self.repos = repos
        self.paypal = paypal

    async def settle(self, job_id: str) -> str:
        job = await self.repos.jobs.require(job_id)
        if job["state"] != JobState.SETTLING.value:
            raise JobNotFound(f"job {job_id} not in SETTLING (state={job['state']})")

        receipt = await self._latest_decision_receipt(job_id)
        amounts: Dict[str, Any] = receipt.get("amounts_cents", {})
        payout_cents = int(amounts.get("worker_payout", 0))
        refund_cents = int(amounts.get("client_refund", 0))

        # Seal the settlement receipt BEFORE any money moves.
        await self._seal_settlement_receipt(job_id, amounts)

        capture_id = (job.get("paypal") or {}).get("capture_id")
        worker_email = job.get("worker_email") or self.paypal_worker_email(job)
        # Simulated money when the platform is in mock mode OR the job itself was
        # created by the demo scenario runner (which seeds a prefunded capture that
        # has no real PayPal capture to refund). Such events are recorded with
        # mode="prefunded" so the ledger never disguises simulated money as real.
        mock_money = settings.SETTLE_MODE == "mock" or job.get("settle_mode_override") == "mock"

        # 1. Pay the worker.
        if payout_cents > 0:
            if mock_money:
                async def call(_rid):  # noqa: ANN202
                    return _mock_payload("PAYOUT", job_id)
            else:
                async def call(rid):  # noqa: ANN202
                    return await self.paypal.create_payout_batch(job_id, worker_email, payout_cents)
            ev = await guarded_money_call(self.repos, job_id, "PAYOUT", payout_cents, call)
            status = ev["status"]
            if status == "FAILED":
                await self._to_review(job_id, JobState.NEEDS_REVIEW.value, "PAYOUT_FAILED")
                return JobState.NEEDS_REVIEW.value
            if status == "UNKNOWN":
                logger.info("payout UNKNOWN for %s; staying SETTLING for reconciler", job_id)
                return JobState.SETTLING.value

        # 2. Refund the client.
        if refund_cents > 0 and capture_id:
            if mock_money:
                async def call(_rid):  # noqa: ANN202
                    return _mock_payload("REFUND", job_id)
            else:
                async def call(rid):  # noqa: ANN202
                    return await self.paypal.refund_capture(job_id, capture_id, refund_cents)
            ev = await guarded_money_call(self.repos, job_id, "REFUND", refund_cents, call)
            status = ev["status"]
            if status == "FAILED":
                await self._to_review(job_id, JobState.NEEDS_REVIEW.value, "REFUND_FAILED")
                return JobState.NEEDS_REVIEW.value
            if status == "UNKNOWN":
                logger.info("refund UNKNOWN for %s; staying SETTLING for reconciler", job_id)
                return JobState.SETTLING.value

        # 3. Everything that had to move, moved. Confirm required events.
        required = [("PAYOUT", payout_cents), ("REFUND", refund_cents if capture_id else 0)]
        for kind, amt in required:
            if amt <= 0:
                continue
            ev = await self.repos.money_events.get(job_id, kind)
            if ev is None or ev["status"] != "SUCCEEDED":
                logger.warning("%s not SUCCEEDED for %s; staying SETTLING", kind, job_id)
                return JobState.SETTLING.value

        final_state = JobState.REFUNDED if payout_cents <= 0 else JobState.SETTLED
        doc = await self.repos.jobs.cas_state(job_id, JobState.SETTLING.value, final_state.value)
        if doc is None:
            logger.info("lost transition race on %s -> %s", job_id, final_state)
            current = await self.repos.jobs.require(job_id)
            return current["state"]
        logger.info("settled %s -> %s", job_id, final_state.value)
        return final_state.value

    def paypal_worker_email(self, job: Dict[str, Any]) -> str:
        return settings.PAYPAL_WORKER_EMAIL

    async def _latest_decision_receipt(self, job_id: str) -> Dict[str, Any]:
        rows = await self.repos.receipts.list_for_job(job_id)
        for r in reversed(rows):
            body = json.loads(r["body_json"])
            if body.get("decision") is not None or body.get("kind") in (None, "decision", "review"):
                if "amounts_cents" in body:
                    return body
        raise JobNotFound(f"no sealed decision receipt for {job_id}")

    async def _seal_settlement_receipt(self, job_id: str, amounts: Dict[str, Any]) -> bool:
        try:
            await self.repos.receipts.insert(
                job_id,
                "settlement",
                {
                    "job_id": job_id,
                    "kind": "settlement",
                    "created_at": utcnow(),
                    "amounts_cents": amounts,
                },
            )
            return True
        except DuplicateKeyError:
            # Replay: settlement receipt already sealed for this job.
            return False

    async def _to_review(self, job_id: str, state: str, reason: str) -> None:
        await create_review(self.repos, job_id, reason)
        await self.repos.jobs.patch(job_id, {"state": JobState.NEEDS_REVIEW.value, "review_reason": reason})