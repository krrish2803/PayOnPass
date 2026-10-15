from typing import Dict, Any, Tuple, List

from app.config import settings
from app.money import round_half_up


def calculate_score_bp(results: Dict[str, bool], matrix: Dict[str, Any]) -> int:
    """Score in basis points = sum of the weight_bp of criteria that passed."""
    total_bp = 0
    for c in matrix.get("criteria", []):
        cid = c["id"]
        weight_bp = c.get("weight_bp")
        if weight_bp is None:
            weight_bp = int(round(c.get("weight", 0.0) * 10000))
        if results.get(cid, False):
            total_bp += weight_bp
    return total_bp


def decide_outcome(
    score_bp: int,
    failed_gates: List[str] = (),
    veto: bool = False,
    injection_suspected: bool = False,
    audit_rule_disagree: bool = False,
    pass_bp: int | None = None,
    fail_bp: int | None = None,
    review_margin_bp: int | None = None,
) -> Tuple[str, str]:
    """
    Decision table (PRD section 4 / prompt Step 9). Review conditions are checked first.
    Returns (decision, reason).
    """
    pass_bp = pass_bp if pass_bp is not None else settings.PASS_BP
    fail_bp = fail_bp if fail_bp is not None else settings.FAIL_BP
    margin = review_margin_bp if review_margin_bp is not None else settings.REVIEW_MARGIN_BP

    if injection_suspected:
        return "NEEDS_REVIEW", "SUSPECTED_INJECTION"
    if audit_rule_disagree:
        return "NEEDS_REVIEW", "GATE_AUDIT_DISAGREE"

    near_pass = abs(score_bp - pass_bp) <= margin
    near_fail = abs(score_bp - fail_bp) <= margin
    clean_pass = score_bp >= pass_bp and not failed_gates and not veto
    if (near_pass or near_fail) and not clean_pass:
        return "NEEDS_REVIEW", "BORDERLINE"

    if veto:
        if score_bp >= pass_bp:
            return "PARTIAL", "VETO_APPLIED"
        return "NEEDS_REVIEW", "VETO_BORDERLINE"

    if score_bp >= pass_bp and not failed_gates:
        return "PASS", "CLEAN_PASS"
    if score_bp >= fail_bp:
        return "PARTIAL", "PARTIAL_PASS"
    return "FAIL", "FAILED_CRITERIA"


def calculate_settlement_amounts(price_cents: int, score_bp: int, fee_rate_bp: int | None = None) -> Dict[str, int]:
    """Integer-only settlement math. Caller passes the *effective* score_bp
    (PASS -> 10000, FAIL -> 0, PARTIAL -> score). Guarantees:
    payout + refund + fee == price_cents."""
    if fee_rate_bp is None:
        fee_rate_bp = settings.FEE_RATE_BP

    share = round_half_up(price_cents * score_bp, 10000)
    fee = round_half_up(share * fee_rate_bp, 10000)
    payout = share - fee
    refund = price_cents - share

    assert payout + refund + fee == price_cents, "reconciliation broke"
    return {
        "price": price_cents,
        "share": share,
        "fee": fee,
        "worker_payout": payout,
        "client_refund": refund,
    }


def effective_score_bp(decision: str, score_bp: int) -> int:
    """Maps a decision to the score used for settlement math."""
    if decision == "PASS":
        return 10000
    if decision == "FAIL":
        return 0
    return score_bp