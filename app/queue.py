"""Human review queue helpers."""

from __future__ import annotations

from datetime import datetime, timezone

from app.repositories import Repos


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


async def create_review(repos: Repos, job_id: str, reason: str, extra: dict | None = None) -> None:
    doc = {
        "job_id": job_id,
        "reason": reason,
        "status": "OPEN",
        "created_at": utcnow(),
    }
    if extra:
        doc.update(extra)
    await repos.reviews.insert(doc)