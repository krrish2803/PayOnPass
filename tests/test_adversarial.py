"""Adversarial / robustness suite (A1-A12).

Each fixture under fixtures/adversarial/ declares what the deterministic layer
(rules + injection scan) must conclude for that hostile or degenerate delivery.
A11 and A12 are behavioural contracts driven through the full API.

The suite writes fixtures/adversarial/results.json so the scorecard shows what
the verifier actually concluded on every case.
"""

from __future__ import annotations

import copy
import glob
import json
import os

from app.verifier.injection import scan_for_injection
from app.verifier.rules import evaluate_rule
from app.agents.scoping import get_demo_matrix

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures", "adversarial")


def _load(slug):
    with open(os.path.join(FIXTURES, slug)) as f:
        return json.load(f)


def _content(fx):
    if "content" in fx:
        return fx["content"]
    gen = fx.get("content_gen")
    if gen and gen.get("kind") == "repeat":
        return gen["char"] * gen["times"]
    return ""


def _matrix(fx):
    matrix = copy.deepcopy(get_demo_matrix())
    matrix["criteria"].extend(copy.deepcopy(fx.get("extra_criteria", [])))
    return matrix


def _fixture_files():
    files = sorted(glob.glob(os.path.join(FIXTURES, "a*.json")))
    assert len(files) >= 12, f"expected A1-A12 fixtures, found {len(files)}"
    return files


def _run_fixture(fx):
    content = _content(fx)
    matrix = _matrix(fx)
    rule_results = {}
    for c in matrix["criteria"]:
        if c.get("kind") == "rule" and c.get("type"):
            rule_results[c["id"]] = evaluate_rule(content, c)["pass"]
    injected, evidence = scan_for_injection(content)
    return rule_results, injected, evidence


def test_adversarial_fixtures_match_declared_expectations():
    results = []
    for path in _fixture_files():
        with open(path) as f:
            fx = json.load(f)
        rule_results, injected, evidence = _run_fixture(fx)

        for rid in fx.get("expect_rule_pass", []):
            assert rule_results.get(rid) is True, f"{fx['id']}: rule {rid} should pass ({rule_results})"
        for rid in fx.get("expect_rule_fail", []):
            assert rule_results.get(rid) is False, f"{fx['id']}: rule {rid} should fail ({rule_results})"
        assert injected is fx["expect_injection"], f"{fx['id']}: injection {injected} != {fx['expect_injection']}"

        results.append({
            "id": fx["id"],
            "name": fx["name"],
            "rule_results": rule_results,
            "injection": injected,
            "injection_evidence": evidence,
            "verdict": "REVIEW" if injected else ("FAIL" if fx.get("expect_rule_fail") else "PASS"),
        })

    with open(os.path.join(FIXTURES, "results.json"), "w") as f:
        json.dump(results, f, indent=2)
        f.write("\n")


def test_a11_soft_audit_flag_needs_review(app_client):
    """Rules all pass but the AI audit flags a soft criterion -> the two layers
    disagree -> NEEDS_REVIEW (GATE_AUDIT_DISAGREE), never an auto-settle. The AI
    can only ever lower an outcome, so a hostile or wrong 'pass' cannot pay out."""
    fx = _load("a11_borderline_soft.json")
    app_client["llm"].audit_flags = ["coverage"]
    r = app_client["client"].post("/jobs", json={
        "prompt": "5 organic cotton T-shirt descriptions", "price_cents": 2000,
        "worker_email": "worker@example.com",
    })
    job_id = r.json()["id"]
    app_client["client"].post(f"/jobs/{job_id}/fund")
    res = app_client["client"].post(f"/jobs/{job_id}/submit", json={"content": fx["content"]}).json()
    assert res["decision"] == "NEEDS_REVIEW", res
    assert res["decision_reason"] == "GATE_AUDIT_DISAGREE", res
    events = app_client["client"].get(f"/ledger/events?job_id={job_id}").json()
    assert all(e["kind"] != "PAYOUT" for e in events)


def test_a12_double_submit_rejected(app_client):
    """A second submission for the same job must be refused (409), so a worker
    cannot re-roll the audit until it passes."""
    fx = _load("a12_double_submit.json")
    r = app_client["client"].post("/jobs", json={
        "prompt": "5 organic cotton T-shirt descriptions", "price_cents": 2000,
        "worker_email": "worker@example.com",
    })
    job_id = r.json()["id"]
    app_client["client"].post(f"/jobs/{job_id}/fund")
    first = app_client["client"].post(f"/jobs/{job_id}/submit", json={"content": fx["content"]})
    assert first.status_code == 200, first.text
    second = app_client["client"].post(f"/jobs/{job_id}/submit", json={"content": fx["content"]})
    assert second.status_code == 409, second.text
