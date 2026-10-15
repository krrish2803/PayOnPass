"""Webhook ingestion: real PayPal event names drive the right money event, and
replays are deduped by event id. The reconciler already covers the same ground
by polling, so webhooks are an enhancement path — but the names must be real.
"""

from __future__ import annotations

import asyncio

from app.api.webhook_route import _apply_event


def _repos(app_client):
    return app_client["client"].app.state.repos


def _seed_pending(repos, job_id, kind):
    asyncio.run(repos.money_events.insert_pending(job_id, kind, 2000, f"req-{kind}"))


def _money_status(app_client, job_id, kind):
    rows = app_client["client"].get(f"/ledger/events?job_id={job_id}&kind={kind}").json()
    return rows[0]["status"] if rows else None


def _job_id(app_client):
    r = app_client["client"].post("/jobs", json={
        "prompt": "5 organic cotton T-shirt descriptions", "price_cents": 2000,
        "worker_email": "worker@example.com",
    })
    return r.json()["id"]


def test_capture_completed_marks_capture_succeeded(app_client):
    repos = _repos(app_client)
    job_id = _job_id(app_client)
    _seed_pending(repos, job_id, "CAPTURE")
    handled = asyncio.run(_apply_event(repos, app_client["paypal"], {
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {"id": "CAP-1", "custom_id": job_id, "amount": {"value": "20.00"}},
    }))
    assert f"CAPTURE:{job_id}" in handled
    assert _money_status(app_client, job_id, "CAPTURE") == "SUCCEEDED"


def test_payouts_batch_success_marks_payout_succeeded(app_client):
    repos = _repos(app_client)
    job_id = _job_id(app_client)
    _seed_pending(repos, job_id, "PAYOUT")
    handled = asyncio.run(_apply_event(repos, app_client["paypal"], {
        "event_type": "PAYMENT.PAYOUTSBATCH.SUCCESS",
        "resource": {"batch_header": {"sender_batch_id": f"settle-{job_id}", "payout_batch_id": "B-1"}},
    }))
    assert f"PAYOUT:{job_id}" in handled
    assert _money_status(app_client, job_id, "PAYOUT") == "SUCCEEDED"


def test_refunded_marks_refund_succeeded(app_client):
    repos = _repos(app_client)
    job_id = _job_id(app_client)
    _seed_pending(repos, job_id, "REFUND")
    handled = asyncio.run(_apply_event(repos, app_client["paypal"], {
        "event_type": "PAYMENT.CAPTURE.REFUNDED",
        "resource": {"id": "REF-1", "reference_id": job_id},
    }))
    assert f"REFUND:{job_id}" in handled
    assert _money_status(app_client, job_id, "REFUND") == "SUCCEEDED"


def test_payout_item_failed_parks_for_review(app_client):
    repos = _repos(app_client)
    job_id = _job_id(app_client)
    _seed_pending(repos, job_id, "PAYOUT")
    asyncio.run(_apply_event(repos, app_client["paypal"], {
        "event_type": "PAYMENT.PAYOUTS-ITEM.FAILED",
        "resource": {"sender_item_id": job_id, "payout_item_id": "I-1"},
    }))
    assert _money_status(app_client, job_id, "PAYOUT") == "FAILED"
    reviews = app_client["client"].get("/reviews").json()
    assert any(r["job_id"] == job_id and r.get("reason") == "PAYOUT_FAILED" for r in reviews)


def test_order_approved_is_acknowledged(app_client):
    repos = _repos(app_client)
    job_id = _job_id(app_client)
    handled = asyncio.run(_apply_event(repos, app_client["paypal"], {
        "event_type": "CHECKOUT.ORDER.APPROVED",
        "resource": {"id": "ORDER-1", "purchase_units": [{"custom_id": job_id}]},
    }))
    assert f"ORDER_APPROVED:{job_id}" in handled


def test_webhook_replay_is_deduped(app_client):
    """Posting the same event id twice: the second is a no-op duplicate."""
    body = {
        "id": "WH-DEDUP-1",
        "event_type": "CHECKOUT.ORDER.APPROVED",
        "resource": {"id": "ORDER-2", "custom_id": "irrelevant"},
    }
    first = app_client["client"].post("/webhooks/paypal", json=body).json()
    second = app_client["client"].post("/webhooks/paypal", json=body).json()
    assert first.get("ok") is True and not first.get("duplicate")
    assert second.get("duplicate") is True
