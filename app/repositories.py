"""Repository layer over MongoDB.

Every state transition uses compare-and-set (update_one with a state filter
and $inc version). modified_count == 0 means the transition lost a race.
Money events carry a UNIQUE {job_id, kind} index as the double-pay guard.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pymongo import ReturnDocument
from pymongo.asynchronous.collection import AsyncCollection
from pymongo.errors import DuplicateKeyError

from app.errors import JobNotFound
from app.verifier.receipt import GENESIS, seal

RECEIPT_SEQ = "receipt_seq"


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


class JobsRepo:
    def __init__(self, coll: AsyncCollection):
        self.coll = coll

    async def insert(self, job: Dict[str, Any]):
        await self.coll.insert_one(job)

    async def get(self, job_id: str) -> Optional[Dict[str, Any]]:
        return await self.coll.find_one({"_id": job_id})

    async def require(self, job_id: str) -> Dict[str, Any]:
        doc = await self.get(job_id)
        if doc is None:
            raise JobNotFound(job_id)
        return doc

    async def cas_state(self, job_id: str, from_state: str, to_state: str, extra: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Compare-and-set state transition. Returns updated doc or None on lost race."""
        update: Dict[str, Any] = {"$set": {"state": to_state, "updated_at": utcnow()}, "$inc": {"version": 1}}
        if extra:
            for k, v in extra.items():
                update["$set"][k] = v
        doc = await self.coll.find_one_and_update(
            {"_id": job_id, "state": from_state},
            update,
            return_document=ReturnDocument.AFTER,
        )
        return doc

    async def patch(self, job_id: str, fields: Dict[str, Any]) -> None:
        fields = dict(fields)
        fields["updated_at"] = utcnow()
        await self.coll.update_one({"_id": job_id}, {"$set": fields})

    async def list_by_state(self, state: str) -> List[Dict[str, Any]]:
        return [d async for d in self.coll.find({"state": state}).sort("created_at", -1)]

    async def list_all(self, limit: int = 200) -> List[Dict[str, Any]]:
        return [d async for d in self.coll.find({}).sort("created_at", -1).limit(limit)]


class ArtifactsRepo:
    def __init__(self, coll: AsyncCollection):
        self.coll = coll

    async def insert(self, doc: Dict[str, Any]):
        await self.coll.insert_one(doc)

    async def list_for_job(self, job_id: str) -> List[Dict[str, Any]]:
        return [d async for d in self.coll.find({"job_id": job_id}).sort("submitted_at", 1)]


class ReceiptsRepo:
    def __init__(self, counters: AsyncCollection, coll: AsyncCollection):
        self.counters = counters
        self.coll = coll

    async def next_seq(self) -> int:
        doc = await self.counters.find_one_and_update(
            {"_id": RECEIPT_SEQ},
            {"$inc": {"value": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        return int(doc["value"])

    async def insert(self, job_id: str, kind: str, body: Dict[str, Any]) -> Dict[str, Any]:
        seq = await self.next_seq()
        prev = await self.last()
        prev_hash = prev["hash"] if prev else GENESIS
        sealed = seal(dict(body), prev_hash)
        # seq is chain-exempt metadata: it is attached after the hash is computed
        # and ignored by verify_chain, so callers can display it without breaking
        # the chain.
        sealed = {**sealed, "seq": seq}
        record = {
            "_id": sealed["hash"],
            "seq": seq,
            "job_id": job_id,
            "kind": kind,
            "body_json": json.dumps(sealed, sort_keys=True),
            "prev_hash": prev_hash,
            "hash": sealed["hash"],
        }
        await self.coll.insert_one(record)
        return sealed

    async def last(self) -> Optional[Dict[str, Any]]:
        return await self.coll.find_one({}, sort=[("seq", -1)])

    async def list_for_job(self, job_id: str) -> List[Dict[str, Any]]:
        return [d async for d in self.coll.find({"job_id": job_id}).sort("seq", 1)]

    async def all_ordered(self) -> List[Dict[str, Any]]:
        return [d async for d in self.coll.find({}).sort("seq", 1)]

    async def list_for_job_sealed(self, job_id: str) -> List[Dict[str, Any]]:
        return [json.loads(d["body_json"]) for d in await self.list_for_job(job_id)]

    async def all_sealed(self) -> List[Dict[str, Any]]:
        return [json.loads(d["body_json"]) for d in await self.all_ordered()]


class MoneyEventsRepo:
    def __init__(self, coll: AsyncCollection):
        self.coll = coll

    async def insert_pending(self, job_id: str, kind: str, amount_cents: int, request_id: str) -> Dict[str, Any]:
        """Creates the PENDING row that gates a money call. Raises DuplicateKeyError if
        the {job_id, kind} guard already exists (a retry/replay)."""
        doc = {
            "job_id": job_id,
            "kind": kind,
            "status": "PENDING",
            "request_id": request_id,
            "paypal_ids": [],
            "amount_cents": amount_cents,
            "response": {},
            "created_at": utcnow(),
        }
        await self.coll.insert_one(doc)
        return doc

    async def get(self, job_id: str, kind: str) -> Optional[Dict[str, Any]]:
        return await self.coll.find_one({"job_id": job_id, "kind": kind})

    async def mark(self, job_id: str, kind: str, status: str, paypal_ids: Optional[List[str]] = None, response: Optional[Dict[str, Any]] = None) -> None:
        update: Dict[str, Any] = {"$set": {"status": status}}
        if paypal_ids is not None:
            update["$set"]["paypal_ids"] = paypal_ids
        if response is not None:
            update["$set"]["response"] = response
        await self.coll.update_one({"job_id": job_id, "kind": kind}, update)

    async def find_stuck(self, statuses: List[str]) -> List[Dict[str, Any]]:
        return [d async for d in self.coll.find({"status": {"$in": statuses}})]

    async def captures_today(self) -> int:
        """Sum of SUCCEEDED captures created on the current UTC day (guardrail)."""
        today = datetime.now(timezone.utc).date().isoformat()
        total = 0
        async for d in self.coll.find({"kind": "CAPTURE", "status": {"$in": ["SUCCEEDED"]}}):
            if d.get("created_at", "").startswith(today):
                total += d.get("amount_cents", 0)
        return total


class ReviewsRepo:
    def __init__(self, coll: AsyncCollection):
        self.coll = coll

    async def insert(self, doc: Dict[str, Any]):
        await self.coll.insert_one(doc)

    async def list_open(self) -> List[Dict[str, Any]]:
        return [d async for d in self.coll.find({"status": "OPEN"}).sort("created_at", -1)]

    async def list_for_job(self, job_id: str) -> List[Dict[str, Any]]:
        return [d async for d in self.coll.find({"job_id": job_id}).sort("created_at", -1)]


class WebhookEventsRepo:
    def __init__(self, coll: AsyncCollection):
        self.coll = coll

    async def remember(self, event_id: str, event_type: str, verified: bool, payload: Dict[str, Any]) -> bool:
        """Stores by event_id; returns False if it was already seen (duplicate ignored)."""
        try:
            await self.coll.insert_one(
                {
                    "_id": event_id,
                    "event_type": event_type,
                    "verified": verified,
                    "payload": payload,
                    "processed_at": utcnow(),
                }
            )
            return True
        except DuplicateKeyError:
            return False


@dataclass
class Repos:
    jobs: JobsRepo
    artifacts: ArtifactsRepo
    receipts: ReceiptsRepo
    money_events: MoneyEventsRepo
    reviews: ReviewsRepo
    webhook_events: WebhookEventsRepo

    @classmethod
    def from_db(cls, db) -> "Repos":
        return cls(
            jobs=JobsRepo(db.jobs),
            artifacts=ArtifactsRepo(db.artifacts),
            receipts=ReceiptsRepo(db.counters, db.receipts),
            money_events=MoneyEventsRepo(db.money_events),
            reviews=ReviewsRepo(db.reviews),
            webhook_events=WebhookEventsRepo(db.webhook_events),
        )