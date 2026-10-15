"""Property tests: the settlement math is exact, total, and monotonic, and the
injection scanner is a pure function of its input."""

from __future__ import annotations

import json

from hypothesis import given, settings
from hypothesis import strategies as st

from app.verifier.injection import normalize, scan_for_injection
from app.verifier.scoring import calculate_settlement_amounts, decide_outcome, effective_score_bp


@given(price=st.integers(min_value=1, max_value=100000), score_bp=st.integers(min_value=0, max_value=10000))
@settings(max_examples=500, deadline=None)
def test_settlement_identity_and_nonneg(price, score_bp):
    r = calculate_settlement_amounts(price, score_bp)
    assert r["worker_payout"] + r["client_refund"] + r["fee"] == price
    assert r["worker_payout"] >= 0
    assert r["client_refund"] >= 0
    assert r["fee"] >= 0
    assert r["share"] <= price


@given(price=st.integers(min_value=1, max_value=100000), score_bp=st.integers(min_value=0, max_value=20000))
@settings(max_examples=200, deadline=None)
def test_settlement_monotonic_by_score(price, score_bp):
    a = calculate_settlement_amounts(price, score_bp)
    b = calculate_settlement_amounts(price, score_bp + 1000)
    assert a["worker_payout"] <= b["worker_payout"]
    assert a["client_refund"] >= b["client_refund"]


@given(score_bp=st.integers(min_value=0, max_value=10000), margin=st.integers(min_value=0, max_value=1000))
@settings(max_examples=200, deadline=None)
def test_decide_is_terminal(score_bp, margin):
    decision, reason = decide_outcome(
        score_bp=score_bp,
        failed_gates=[],
        veto=False,
        injection_suspected=False,
        pass_bp=8500,
        fail_bp=5000,
        review_margin_bp=margin,
    )
    assert decision in ("PASS", "PARTIAL", "FAIL", "NEEDS_REVIEW")
    # decisions that are not clean passes never move money by themselves
    if decision == "FAIL":
        assert effective_score_bp(decision, score_bp) == 0
    assert 0 <= effective_score_bp(decision, score_bp) <= 10000


@given(text=st.text(alphabet=st.characters(blacklist_categories=("Cs",)), max_size=500))
@settings(max_examples=300, deadline=None)
def test_injection_scanner_deterministic(text):
    first = scan_for_injection(text)
    second = scan_for_injection(text)
    assert first == second
    injected, evidence = first
    if injected:
        assert isinstance(evidence, str) and evidence
    if not injected:
        assert evidence == ""
    assert normalize(text) == normalize(text)


@given(d=st.dictionaries(st.text(min_size=1, max_size=20), st.text(max_size=50), max_size=10))
@settings(max_examples=100, deadline=None)
def test_receipt_canonical_json_roundtrip(d):
    from app.verifier.receipt import canonical, seal, GENESIS

    sealed = seal(dict(d), GENESIS)
    assert isinstance(sealed["hash"], str) and len(sealed["hash"]) == 64
    assert json.loads(canonical(dict(d))) == d