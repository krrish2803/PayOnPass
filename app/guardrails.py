"""Spending guardrails enforced at job creation."""

from __future__ import annotations

from app.config import settings
from app.errors import GuardrailRejected
from app.repositories import Repos


async def check_guardrails(repos: Repos, price_cents: int) -> None:
    if price_cents > settings.MAX_JOB_CENTS:
        raise GuardrailRejected(
            f"price {price_cents}c exceeds MAX_JOB_CENTS {settings.MAX_JOB_CENTS}c"
        )
    captured_today = await repos.money_events.captures_today()
    if captured_today + price_cents > settings.DAILY_CAP_CENTS:
        raise GuardrailRejected(
            f"today's captured {captured_today}c plus {price_cents}c would exceed "
            f"DAILY_CAP_CENTS {settings.DAILY_CAP_CENTS}c"
        )