"""End-to-end job orchestration shared by the REST and agent APIs.

Money never moves outside SETTLING; SETTLED/REFUNDED is only ever reached after
the settlement engine confirms every required money event as SUCCEEDED.
"""

from __future__ import annotations

import hashlib
import json
import logging
import uuid
from typing import Any, Dict, List

from app.agents.prompts import SECOND_OPINION_SYSTEM_PROMPT
from app.agents.scoping import generate_acceptance_matrix, get_demo_matrix
from app.config import settings
from app.errors import ArtifactRejected, IllegalTransition, JobNotFound, MatrixValidationError
from app.guardrails import check_guardrails
from app.llm.provider import LLMClient
from app.moneyflow import guarded_money_call
from app.paypal.client import PayPalClient, capture_summary
from app.queue import create_review, utcnow
from app.repositories import Repos
from app.settlement import SettlementEngine
from app.state_machine import JobState
from app.verifier.injection import scan_for_injection
from app.verifier.llm_audit import run_bounded_llm_audit
from app.verifier.receipt import canonical
from app.verifier.rules import evaluate_rule
from app.verifier.scoring import (
    calculate_score_bp,
    calculate_settlement_amounts,
    decide_outcome,
    effective_score_bp,
)

logger = logging.getLogger("payonpass.services")


def _sha(obj: Dict[str, Any]) -> str:
    return hashlib.sha256(canonical(obj)).hexdigest()


def _llm_criteria(matrix: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [c for c in matrix.get("criteria", []) if c.get("kind") == "llm"]


def _rule_criteria(matrix: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [c for c in matrix.get("criteria", []) if c.get("kind") == "rule"]


def _audits_disagree(first: Dict[str, Any], second: Dict[str, Any]) -> bool:
    """Two independent audits disagree when any soft criterion verdict differs, or
    when their veto/injection flags differ. A disagreement always routes to review."""
    if bool(first.get("veto")) != bool(second.get("veto")):
        return True
    if bool(first.get("injection_suspected")) != bool(second.get("injection_suspected")):
        return True
    a = {r["id"]: bool(r.get("pass")) for r in first.get("criteria", [])}
    b = {r["id"]: bool(r.get("pass")) for r in second.get("criteria", [])}
    for cid in set(a) | set(b):
        if a.get(cid) != b.get(cid):
            return True
    return False


async def create_job(
    repos: Repos,
    llm: LLMClient,
    prompt: str,
    price_cents: int,
    worker_email: str,
    title: str | None = None,
    worker_kind: str = "human",
    buyer_ref: str | None = None,
    allow_demo_fallback: bool = False,
) -> Dict[str, Any]:
    await check_guardrails(repos, price_cents)

    try:
        matrix, source = await generate_acceptance_matrix(prompt, price_cents, llm)
    except MatrixValidationError:
        # Demo scenarios prefer a real LLM matrix but must not break when the key
        # is missing/rate-limited: fall back to the canonical demo matrix, clearly
        # labelled. Real (non-demo) jobs never take this path.
        if not allow_demo_fallback:
            raise
        matrix = get_demo_matrix()
        matrix["price_cents"] = price_cents
        source = "offline-demo:llm-unavailable"

    job_id = uuid.uuid4().hex
    now = utcnow()
    job = {
        "_id": job_id,
        "title": title or matrix.get("job_title") or "Untitled job",
        "prompt": prompt,
        "price_cents": int(matrix["price_cents"]),
        "currency": matrix.get("currency", "USD"),
        "worker_email": worker_email,
        "worker_kind": worker_kind,
        "buyer_ref": buyer_ref,
        "state": JobState.CREATED.value,
        "matrix": matrix,
        "matrix_hash": _sha(matrix),
        "matrix_source": source,
        "paypal": {},
        "version": 1,
        "created_at": now,
        "updated_at": now,
    }
    await repos.jobs.insert(job)
    return job


async def submit_deliverable(
    repos: Repos,
    llm: LLMClient,
    paypal: PayPalClient,
    job_id: str,
    content: str,
    submitted_by: str = "worker",
) -> Dict[str, Any]:
    job = await repos.jobs.require(job_id)
    if job["state"] != JobState.FUNDED.value:
        raise IllegalTransition(job["state"], "submission requires FUNDED")

    await repos.artifacts.insert(
        {
            "job_id": job_id,
            "version": 1,
            "content": content,
            "content_hash": hashlib.sha256(content.encode("utf-8")).hexdigest(),
            "submitted_by": submitted_by,
            "submitted_at": utcnow(),
        }
    )

    doc = await repos.jobs.cas_state(job_id, JobState.FUNDED.value, JobState.DELIVERED.value)
    if doc is None:
        raise IllegalTransition(job["state"], "lost SUBMIT race")
    job = doc

    matrix: Dict[str, Any] = job["matrix"]

    # Layer 0: rule checks (deterministic).
    rule_results: List[Dict[str, Any]] = []
    failed_gates: List[str] = []
    for c in _rule_criteria(matrix):
        res = evaluate_rule(content, c)
        rule_results.append(res)
        if not res["pass"] and c.get("gate"):
            failed_gates.append(c["id"])

    # Layer 2: deterministic injection scan.
    injected, injection_evidence = scan_for_injection(content)

    # Layer 3: bounded LLM audit (soft criteria only, no score).
    try:
        audit = await run_bounded_llm_audit(content, _llm_criteria(matrix), llm)
    except ArtifactRejected as e:
        # LLM unavailable or invalid output twice: nothing is paid automatically.
        # Park the job in the human queue with reason AUDIT_ERROR (PRD 6.3).
        receipt = {
            "job_id": job_id,
            "kind": "decision",
            "created_at": utcnow(),
            "matrix_hash": job.get("matrix_hash"),
            "artifact_hash": hashlib.sha256(content.encode("utf-8")).hexdigest(),
            "rule_results": rule_results,
            "llm_results": [],
            "error": str(e),
            "score_bp": 0,
            "audit_ran": False,
            "decision": "NEEDS_REVIEW",
            "decision_reason": "AUDIT_ERROR",
            "amounts_cents": {},
        }
        sealed = await repos.receipts.insert(job_id, "decision", receipt)
        await create_review(repos, job_id, "AUDIT_ERROR")
        doc = await repos.jobs.cas_state(
            job_id,
            JobState.DELIVERED.value,
            JobState.NEEDS_REVIEW.value,
            {"review_reason": "AUDIT_ERROR"},
        )
        return _submit_response(doc or job, "NEEDS_REVIEW", "AUDIT_ERROR", 0, sealed, {})

    audit_results = audit.get("criteria", [])
    audit_by_id = {r["id"]: r for r in audit_results}

    combined_results: Dict[str, bool] = {}
    for c in matrix.get("criteria", []):
        if c.get("kind") == "rule":
            hit = next((r for r in rule_results if r["id"] == c["id"]), {"pass": False})
            combined_results[c["id"]] = bool(hit["pass"])
        else:
            ar = audit_by_id.get(c["id"])
            combined_results[c["id"]] = bool(ar["pass"]) if ar else True

    score_bp = calculate_score_bp(combined_results, matrix)

    llm_all_pass = all(r["pass"] for r in audit_results) if audit_results else True
    has_gates = bool(failed_gates or _rule_criteria(matrix))
    # "Disagree" = the two layers reached opposite verdicts: rules flag gates while
    # the audit clears everything, or rules clear while the audit flags something.
    audit_rule_disagree = has_gates and (bool(failed_gates) == llm_all_pass)

    decision, reason = decide_outcome(
        score_bp=score_bp,
        failed_gates=failed_gates,
        veto=bool(audit.get("veto")),
        injection_suspected=injected or bool(audit.get("injection_suspected")),
        audit_rule_disagree=audit_rule_disagree,
    )

    # Layer 4 (P9): a second, independent audit re-checks jobs in the borderline
    # band. A disagreement always creates a review item; it can never raise an
    # outcome. Skipped offline or when there are no soft criteria to re-check.
    second_opinion: List[Dict[str, Any]] | None = None
    margin = settings.REVIEW_MARGIN_BP
    borderline_band = (
        abs(score_bp - settings.PASS_BP) <= margin
        or abs(score_bp - settings.FAIL_BP) <= margin
    )
    if (
        borderline_band
        and audit.get("audit_ran")
        and _llm_criteria(matrix)
        and (decision in ("PASS", "PARTIAL") or reason == "BORDERLINE")
    ):
        try:
            second = await run_bounded_llm_audit(
                content,
                _llm_criteria(matrix),
                llm,
                system_prompt=SECOND_OPINION_SYSTEM_PROMPT,
            )
            second_opinion = second.get("criteria", [])
            if _audits_disagree(audit, second):
                decision, reason = "NEEDS_REVIEW", "AUDIT_DISAGREE"
        except ArtifactRejected:
            decision, reason = "NEEDS_REVIEW", "AUDIT_ERROR"

    amounts = calculate_settlement_amounts(job["price_cents"], effective_score_bp(decision, score_bp))

    receipt = {
        "job_id": job_id,
        "kind": "decision",
        "created_at": utcnow(),
        "matrix_hash": job.get("matrix_hash"),
        "artifact_hash": content and hashlib.sha256(content.encode("utf-8")).hexdigest(),
        "rule_results": rule_results,
        "llm_results": audit_results,
        "second_opinion": second_opinion,
        "veto": audit.get("veto"),
        "veto_reason": audit.get("veto_reason"),
        "injection_suspected": injected or audit.get("injection_suspected"),
        "injection_evidence": injection_evidence or audit.get("injection_evidence"),
        "score_bp": score_bp,
        "audit_ran": audit.get("audit_ran"),
        "decision": decision,
        "decision_reason": reason,
        "amounts_cents": amounts,
    }
    sealed = await repos.receipts.insert(job_id, "decision", receipt)

    if decision != "PASS" and decision != "PARTIAL":
        # NEEDS_REVIEW or FAIL threshold failures go to the human review queue.
        reason_label = reason or "MANUAL_REVIEW"
        await create_review(repos, job_id, reason_label)
        doc = await repos.jobs.cas_state(
            job_id,
            JobState.DELIVERED.value,
            JobState.NEEDS_REVIEW.value,
            {"review_reason": reason_label},
        )
        return _submit_response(doc, decision, reason, score_bp, sealed, amounts)

    doc = await repos.jobs.cas_state(job_id, JobState.DELIVERED.value, JobState.SETTLING.value)
    if doc is None:
        raise IllegalTransition("DELIVERED", "lost SETTLE race")
    final = await SettlementEngine(repos, paypal).settle(job_id)
    doc = await repos.jobs.require(job_id)
    return _submit_response(doc, decision, reason, score_bp, sealed, amounts, final_state=final)


def _submit_response(
    job: Dict[str, Any],
    decision: str,
    reason: str,
    score_bp: int,
    receipt: Dict[str, Any],
    amounts: Dict[str, int],
    final_state: str | None = None,
) -> Dict[str, Any]:
    return {
        "job_id": job["_id"],
        "state": job["state"],
        "final_state": final_state or job["state"],
        "decision": decision,
        "decision_reason": reason,
        "score_bp": score_bp,
        "amounts_cents": amounts,
        "receipt": {
            "hash": receipt.get("hash"),
            "seq": receipt.get("seq"),
            "prev_hash": receipt.get("prev_hash"),
        },
        "matrix_source": job.get("matrix_source"),
    }


async def fund_job(repos: Repos, paypal: PayPalClient, job_id: str, mode: str | None = None) -> Dict[str, Any]:
    job = await repos.jobs.require(job_id)
    if job["state"] != JobState.CREATED.value:
        raise IllegalTransition(job["state"], "funding requires CREATED")

    funding_mode = mode or settings.FUNDING_MODE
    if funding_mode == "prefunded":
        await repos.money_events.insert_pending(job_id, "CAPTURE", job["price_cents"],
                                                _sha({"job_id": job_id, "kind": "capture"}))
        await repos.money_events.mark(job_id, "CAPTURE", "SUCCEEDED",
                                      paypal_ids=["prefunded-mock"], response={"mode": "prefunded"})
        doc = await repos.jobs.cas_state(
            job_id, JobState.CREATED.value, JobState.FUNDED.value,
            {
                "paypal": {"capture_id": "prefunded-mock", "order_id": None, "mode": "prefunded"},
                "captured_cents": job["price_cents"],
                "paypal_fee_cents": 0,
            },
        )
        if doc is None:
            raise IllegalTransition(job["state"], "lost FUND race")
        return {"job_id": job_id, "state": doc["state"], "approval_url": None, "mode": "prefunded"}

    # live mode: create the order idempotently (re-using an existing order)
    existing = (job.get("paypal") or {}).get("order_id")
    if existing:
        await repos.jobs.cas_state(job_id, JobState.CREATED.value, JobState.FUNDED.value,
                                   {"paypal": {**job.get("paypal", {}), "order_id": existing}})
        return {"job_id": job_id, "state": "FUNDED", "approval_url": None, "mode": "live", "order_id": existing}

    order = await paypal.create_order(job_id, job["price_cents"], job.get("currency", "USD"))
    order_id = order.get("id")
    url = paypal.approval_url(order)
    paypal_data = {**job.get("paypal", {}), "order_id": order_id, "approval_url": url}
    doc = await repos.jobs.cas_state(
        job_id, JobState.CREATED.value, JobState.FUNDED.value, {"paypal": paypal_data}
    )
    if doc is None:
        raise IllegalTransition(job["state"], "lost FUND race")
    return {"job_id": job_id, "state": doc["state"], "approval_url": url, "mode": "live"}


async def confirm_capture(repos: Repos, paypal: PayPalClient, job_id: str) -> Dict[str, Any]:
    """Called from the PayPal return URL. Captures exactly once (money guard)."""
    job = await repos.jobs.require(job_id)
    if job["state"] != JobState.FUNDED.value:
        return {"job_id": job_id, "state": job["state"], "captured": False, "detail": "job not in FUNDED"}

    order_id = (job.get("paypal") or {}).get("order_id")
    if not order_id:
        raise IllegalTransition(job["state"], "no PayPal order on job")

    ev = await guarded_money_call(
        repos,
        job_id,
        "CAPTURE",
        job["price_cents"],
        lambda rid: paypal.capture_order(job_id, order_id),
    )
    status = ev["status"]
    if status == "SUCCEEDED":
        summary = capture_summary(ev.get("response") or {})
        capture_ids = ev.get("paypal_ids") or []
        capture_id = summary.get("capture_id") or (capture_ids[0] if capture_ids else None)
        paypal_data = {**job.get("paypal", {}), "capture_id": capture_id}
        patch: Dict[str, Any] = {"paypal": paypal_data}
        if summary.get("gross_cents") is not None:
            patch["captured_cents"] = summary["gross_cents"]
        if summary.get("paypal_fee_cents") is not None:
            patch["paypal_fee_cents"] = summary["paypal_fee_cents"]
        await repos.jobs.patch(job_id, patch)
        return {
            "job_id": job_id,
            "state": JobState.FUNDED.value,
            "captured": True,
            "captured_cents": patch.get("captured_cents"),
            "paypal_fee_cents": patch.get("paypal_fee_cents"),
        }
    if status == "FAILED":
        await create_review(repos, job_id, "CAPTURE_FAILED")
        await repos.jobs.patch(job_id, {"state": JobState.NEEDS_REVIEW.value, "review_reason": "CAPTURE_FAILED"})
        return {"job_id": job_id, "state": JobState.NEEDS_REVIEW.value, "captured": False}
    # UNKNOWN: reconciler will query PayPal; keep FUNDED so return-URL re-entry can't double-capture.
    return {"job_id": job_id, "state": JobState.FUNDED.value, "captured": False, "detail": "capture pending verification"}


async def decide_review(
    repos: Repos,
    paypal: PayPalClient,
    job_id: str,
    decision: str,  # APPROVE | ADJUST | REJECT
    score_bp: int | None = None,
    note: str | None = None,
) -> Dict[str, Any]:
    job = await repos.jobs.require(job_id)
    if job["state"] != JobState.NEEDS_REVIEW.value:
        raise IllegalTransition(job["state"], "decision requires NEEDS_REVIEW")

    if decision == "APPROVE":
        score_bp = score_bp or 10000
    elif decision == "REJECT":
        score_bp = 0
    else:  # ADJUST
        score_bp = max(0, min(10000, score_bp if score_bp is not None else 5000))

    amounts = calculate_settlement_amounts(job["price_cents"], score_bp)
    receipt = {
        "job_id": job_id,
        "kind": "review",
        "created_at": utcnow(),
        "reviewer_decision": decision,
        "adjusted_score_bp": score_bp,
        "note": note,
        "amounts_cents": amounts,
    }
    sealed = await repos.receipts.insert(job_id, "review", receipt)

    # Close the open review item for this job.
    for r in await repos.reviews.list_for_job(job_id):
        if r["status"] == "OPEN":
            await repos.reviews.coll.update_one(
                {"_id": r["_id"]}, {"$set": {"status": "DECIDED", "decided_record": sealed.get("hash")}}
            )

    doc = await repos.jobs.cas_state(
        job_id,
        JobState.NEEDS_REVIEW.value,
        JobState.SETTLING.value,
        {"review_reason": None, "adjusted_score_bp": score_bp},
    )
    if doc is None:
        raise IllegalTransition("NEEDS_REVIEW", "lost DECIDE race")
    final = await SettlementEngine(repos, paypal).settle(job_id)
    job_after = await repos.jobs.require(job_id)
    return {
        "job_id": job_id,
        "state": job_after["state"],
        "final_state": final,
        "adjusted_score_bp": score_bp,
        "amounts_cents": amounts,
        "receipt": {"hash": sealed.get("hash"), "seq": sealed.get("seq")},
    }


async def get_chain(repos: Repos) -> Dict[str, Any]:
    from app.verifier.receipt import verify_chain

    all_sealed = await repos.receipts.all_sealed()
    return {"length": len(all_sealed), "valid": verify_chain(all_sealed), "receipts": all_sealed}