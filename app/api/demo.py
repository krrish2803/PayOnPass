"""Demo / developer affordances (opt-in via ENABLE_DEV_TOOLS).

- Scenario runner: drives S1-S5 through the *real* pipeline — a real LLM-built
  acceptance matrix, real PayPal funding (a live order the buyer approves, then a
  real capture) and real PayPal settlement (a real payout to the worker and a real
  refund to the client). Because a real refund needs a real capture, the runner is
  a two-step flow in live mode: `POST /demo/scenarios/{id}/run` files + funds the
  job and returns the approval URL; once the buyer approves and the capture lands,
  `POST /demo/scenarios/complete/{job_id}` submits the deliverable, applies the
  scenario's intended review decision, and settles. With FUNDING_MODE=prefunded
  (tests / offline) funding needs no approval and run completes in one call.
- Tamper test: corrupts one sealed receipt in place so /verify-chain flips to
  invalid — a live demonstration that the hash chain detects edits.

Both are gated: with ENABLE_DEV_TOOLS=false the routes 404.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_llm, get_paypal, get_repos
from app.config import settings
from app.demo_scenarios import get_scenario, public_list
from app.llm.provider import LLMClient
from app.paypal.client import PayPalClient
from app.repositories import Repos
from app.services import create_job, decide_review, fund_job, get_chain, submit_deliverable
from app.state_machine import JobState

router = APIRouter(prefix="/demo")

_SCENARIO_PROMPT = "Write 5 product descriptions for an organic cotton T-shirt shop, 90 to 110 words each."
_SCENARIO_PRICE_CENTS = 2000


def _guard() -> None:
    if not settings.ENABLE_DEV_TOOLS:
        raise HTTPException(status_code=404, detail="demo endpoints disabled (set ENABLE_DEV_TOOLS=true)")


def _public(scenario: dict) -> dict:
    return {k: v for k, v in scenario.items() if k not in ("content", "on_review")}


async def _settle_scenario(
    repos: Repos, llm: LLMClient, paypal: PayPalClient, scenario: dict, job_id: str
) -> dict:
    """Submit the canned deliverable, apply the scenario's review action if the
    pipeline parks the job, and return the final verdict + dollars."""
    res = await submit_deliverable(repos, llm, paypal, job_id, scenario["content"], submitted_by="agent-worker")
    engine = {
        "decision": res.get("decision"),
        "reason": res.get("decision_reason"),
        "score_bp": res.get("score_bp"),
    }
    amounts = res.get("amounts_cents") or {}

    review = None
    job_after = await repos.jobs.require(job_id)
    act = scenario.get("on_review")
    if job_after["state"] == JobState.NEEDS_REVIEW.value and act:
        r2 = await decide_review(repos, paypal, job_id, act["decision"], act.get("score_bp"), note="scenario runner")
        review = {"decision": act["decision"], "score_bp": r2.get("adjusted_score_bp")}
        amounts = r2.get("amounts_cents") or amounts
        job_after = await repos.jobs.require(job_id)

    return {
        "scenario": _public(scenario),
        "job_id": job_id,
        "engine": engine,
        "review": review,
        "state": job_after["state"],
        "final_state": job_after["state"],
        "amounts_cents": amounts,
        "matrix_source": res.get("matrix_source"),
        "needs_approval": False,
        "approval_url": None,
    }


@router.get("/scenarios")
async def list_scenarios():
    return {"enabled": settings.ENABLE_DEV_TOOLS, "scenarios": public_list()}


@router.post("/scenarios/{sid}/run")
async def run_scenario(
    sid: str,
    repos: Repos = Depends(get_repos),
    llm: LLMClient = Depends(get_llm),
    paypal: PayPalClient = Depends(get_paypal),
):
    _guard()
    scenario = get_scenario(sid)
    if scenario is None:
        raise HTTPException(status_code=404, detail=f"unknown scenario '{sid}'")

    # Real matrix (live LLM when a key is configured) and real money movement.
    job = await create_job(
        repos,
        llm,
        _SCENARIO_PROMPT,
        _SCENARIO_PRICE_CENTS,
        settings.PAYPAL_WORKER_EMAIL,
        title=f"{scenario['id']} · {scenario['name']}",
        worker_kind="agent",
        allow_demo_fallback=True,  # real LLM, but don't 500 when the key is rate-limited
    )
    job_id = job["_id"]
    await repos.jobs.patch(job_id, {"demo": True, "demo_scenario": scenario["id"]})

    fund = await fund_job(repos, paypal, job_id)
    if fund.get("approval_url"):
        # Live funding: the buyer must approve before anything can settle.
        return {
            "scenario": _public(scenario),
            "job_id": job_id,
            "state": fund["state"],
            "mode": fund["mode"],
            "approval_url": fund["approval_url"],
            "needs_approval": True,
            "engine": None,
            "review": None,
            "amounts_cents": None,
            "matrix_source": job.get("matrix_source"),
        }

    # Prefunded (tests / offline): no approval needed — finish in one call.
    return await _settle_scenario(repos, llm, paypal, scenario, job_id)


@router.post("/scenarios/complete/{job_id}")
async def complete_scenario(
    job_id: str,
    repos: Repos = Depends(get_repos),
    llm: LLMClient = Depends(get_llm),
    paypal: PayPalClient = Depends(get_paypal),
):
    """Step 2 of the live flow: after the buyer approves and the capture lands,
    submit the deliverable and settle."""
    _guard()
    job = await repos.jobs.require(job_id)
    sid = job.get("demo_scenario")
    scenario = get_scenario(sid) if sid else None
    if scenario is None:
        raise HTTPException(status_code=404, detail="not a scenario job")

    if not job.get("captured_cents"):
        raise HTTPException(
            status_code=409,
            detail=f"waiting for buyer approval + capture (state={job['state']})",
        )
    return await _settle_scenario(repos, llm, paypal, scenario, job_id)


@router.post("/tamper")
async def tamper_receipt(job_id: str | None = None, repos: Repos = Depends(get_repos)):
    """Corrupt one sealed receipt (latest, or the latest for a job) so the hash
    chain no longer verifies. Demonstrates tamper-evidence."""
    _guard()
    before = await get_chain(repos)

    docs = await repos.receipts.all_ordered()  # oldest -> newest
    if job_id:
        docs = [d for d in docs if d.get("job_id") == job_id]
    if not docs:
        raise HTTPException(status_code=404, detail="no sealed receipts to tamper with")

    target = docs[-1]
    body = json.loads(target["body_json"])
    body["_tampered"] = "edited after sealing — demo"
    await repos.receipts.coll.update_one(
        {"_id": target["_id"]},
        {"$set": {"body_json": json.dumps(body, sort_keys=True)}},
    )

    after = await get_chain(repos)
    return {
        "tampered": {"job_id": target.get("job_id"), "seq": target.get("seq"), "hash": target.get("hash")},
        "before": {"valid": before["valid"], "length": before["length"]},
        "after": {"valid": after["valid"], "length": after["length"]},
    }
