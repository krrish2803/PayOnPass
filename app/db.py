import inspect
from typing import Optional

from pymongo.asynchronous.database import AsyncDatabase
from pymongo.asynchronous.mongo_client import AsyncMongoClient
from pymongo.server_api import ServerApi

from app.config import settings

_client: Optional[AsyncMongoClient] = None
_db: Optional[AsyncDatabase] = None


def get_client() -> AsyncMongoClient:
    global _client
    if _client is None:
        _client = AsyncMongoClient(
            settings.MONGODB_URI,
            server_api=ServerApi("1"),
            connectTimeoutMS=15000,
            serverSelectionTimeoutMS=15000,
        )
    return _client


def get_db() -> AsyncDatabase:
    global _db
    if _db is None:
        _db = get_client()[settings.MONGODB_DB]
    return _db


async def close():
    """Close the client defensively so both real PyMongo and mongomock-motor work."""
    global _client, _db
    if _client is not None:
        ret = _client.close()
        if inspect.isawaitable(ret):
            await ret
    _client = None
    _db = None


close_db = close


async def ping() -> bool:
    await get_db().command("ping")
    return True


async def init_indexes():
    """Create all indexes idempotently (safe to run at every startup)."""
    db = get_db()

    await db.jobs.create_index([("state", 1)])
    await db.jobs.create_index([("buyer_ref", 1)])
    await db.jobs.create_index([("created_at", -1)])

    await db.artifacts.create_index([("job_id", 1)])
    await db.artifacts.create_index([("content_hash", 1)])

    await db.receipts.create_index([("seq", 1)], unique=True)
    await db.receipts.create_index([("job_id", 1), ("kind", 1)], unique=True)
    await db.receipts.create_index([("job_id", 1)])

    await db.money_events.create_index(
        [("job_id", 1), ("kind", 1)], unique=True
    )  # double-pay guard
    await db.money_events.create_index([("status", 1)])

    await db.reviews.create_index([("job_id", 1)])
    await db.reviews.create_index([("status", 1)])

    await db.webhook_events.create_index([("event_type", 1)])

    return db