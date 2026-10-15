"""Demo affordances: scenario runner (real 2-step flow) and the tamper test.

In tests funding is prefunded, so `run` completes in one call. A separate test
drives the live 2-step flow (approval URL -> capture -> complete). The tests
exercise the full pipeline through the API with the scriptable PayPal + LLM
doubles.
"""

from __future__ import annotations

import pytest

from app.money import request_id


@pytest.fixture
def dev(app_client, monkeypatch):
    monkeypatch.setattr("app.config.settings.ENABLE_DEV_TOOLS", True)
    return app_client


def test_dev_tools_disabled_by_default(app_client, monkeypatch):
    monkeypatch.setattr("app.config.settings.ENABLE_DEV_TOOLS", False)
    c = app_client["client"]
    assert c.get("/demo/scenarios").json()["enabled"] is False
    assert c.post("/demo/scenarios/S1/run").status_code == 404
    assert c.post("/demo/scenarios/complete/abc").status_code == 404
    assert c.post("/demo/tamper").status_code == 404


def test_scenario_runner_reproduces_prd_outcomes(dev):
    """Each scenario reaches the PRD's expected final state and dollars, applying
    the scenario's review action when the pipeline parks the job."""
    c = dev["client"]
    expected = {
        # sid: (engine decision, review decision, final state, worker_payout, refund)
        "S1": ("PASS", None, "SETTLED", 1800, 0),
        "S2": ("NEEDS_REVIEW", "ADJUST", "SETTLED", 1080, 800),
        "S3": ("NEEDS_REVIEW", "REJECT", "REFUNDED", 0, 2000),
        "S4": ("NEEDS_REVIEW", "REJECT", "REFUNDED", 0, 2000),
        "S5": ("NEEDS_REVIEW", "ADJUST", "SETTLED", 1440, 400),
    }
    for sid, (engine_dec, review_dec, state, payout, refund) in expected.items():
        r = c.post(f"/demo/scenarios/{sid}/run")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["scenario"]["id"] == sid
        assert body["needs_approval"] is False
        assert body["engine"]["decision"] == engine_dec, (sid, body["engine"])
        if review_dec:
            assert body["review"]["decision"] == review_dec, (sid, body["review"])
        else:
            assert body["review"] is None, (sid, body["review"])
        assert body["state"] == state, (sid, body)
        amt = body["amounts_cents"]
        assert amt["worker_payout"] == payout, (sid, amt)
        assert amt["client_refund"] == refund, (sid, amt)
        assert amt["worker_payout"] + amt["client_refund"] + amt["fee"] == amt["price"]


def test_scenario_settlement_moves_real_money(dev):
    """Settlement is real: the runner calls PayPal for the payout AND the refund
    (no simulated mode)."""
    c = dev["client"]
    job_id = c.post("/demo/scenarios/S2/run").json()["job_id"]  # payout AND refund
    joined = " ".join(dev["paypal"].calls)
    assert "payout:" in joined and "refund:" in joined, dev["paypal"].calls
    calls = c.get(f"/jobs/{job_id}/paypal-calls").json()
    payout = next(x for x in calls if x["kind"] == "PAYOUT")
    refund = next(x for x in calls if x["kind"] == "REFUND")
    assert payout["status"] == "SUCCEEDED" and refund["status"] == "SUCCEEDED"
    assert payout["mode"] != "prefunded" and refund["mode"] != "prefunded"


def test_scenario_live_two_step_flow(dev, monkeypatch):
    """Live funding cannot settle without a real capture: run returns an approval
    URL, complete is refused until capture lands, then settles for real."""
    monkeypatch.setattr("app.config.settings.FUNDING_MODE", "live")
    c = dev["client"]

    run = c.post("/demo/scenarios/S1/run").json()
    assert run["needs_approval"] is True
    assert run["approval_url"], run
    assert run["state"] == "FUNDED"
    assert run["amounts_cents"] is None
    job_id = run["job_id"]

    # buyer hasn't approved yet -> complete is refused
    assert c.post(f"/demo/scenarios/complete/{job_id}").status_code == 409

    # buyer approves -> PayPal return captures for real
    cap = c.get(f"/paypal/return?job_id={job_id}&token={run['approval_url']}")
    assert cap.status_code == 200, cap.text

    done = c.post(f"/demo/scenarios/complete/{job_id}").json()
    assert done["state"] == "SETTLED"
    assert done["amounts_cents"]["worker_payout"] == 1800
    joined = " ".join(dev["paypal"].calls)
    assert f"capture:{job_id}" in joined and f"payout:{job_id}:1800" in joined


def test_paypal_calls_reports_request_ids_and_status(dev):
    c = dev["client"]
    job_id = c.post("/demo/scenarios/S1/run").json()["job_id"]
    calls = c.get(f"/jobs/{job_id}/paypal-calls").json()
    kinds = {x["kind"]: x for x in calls}
    assert {"CAPTURE", "PAYOUT"} <= set(kinds)
    # the payout goes through guarded_money_call, so its idempotency key is the
    # app's deterministic request_id().
    assert kinds["PAYOUT"]["request_id"] == request_id(job_id, "payout")
    for x in calls:
        assert "response" in x and "fee_cents" in x


def test_tamper_breaks_the_hash_chain(dev):
    c = dev["client"]
    c.post("/demo/scenarios/S1/run")  # seals decision + settlement receipts
    assert c.get("/verify-chain").json()["valid"] is True

    res = c.post("/demo/tamper").json()
    assert res["before"]["valid"] is True
    assert res["after"]["valid"] is False
    assert res["tampered"]["seq"] is not None
    assert c.get("/verify-chain").json()["valid"] is False
