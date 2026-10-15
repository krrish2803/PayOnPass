"""Verifier scorecard: the adversarial suite's own results, served to the dashboard.

The results file is written by tests/test_adversarial.py on every run, so the
scorecard reflects what the verifier actually concluded — never a hand-typed claim.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter

router = APIRouter()

_RESULTS = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "adversarial" / "results.json"


@router.get("/verifier/scorecard")
async def verifier_scorecard() -> Dict[str, Any]:
    if not _RESULTS.exists():
        return {"available": False, "reason": "run pytest to generate the adversarial results", "cases": []}

    cases: List[Dict[str, Any]] = json.loads(_RESULTS.read_text())
    by_verdict: Dict[str, int] = {}
    for c in cases:
        v = c.get("verdict", "?")
        by_verdict[v] = by_verdict.get(v, 0) + 1
    attack_cases = [c for c in cases if c.get("injection")]
    attacks_held = [c for c in attack_cases if c.get("verdict") == "REVIEW"]
    return {
        "available": True,
        "total": len(cases),
        "by_verdict": by_verdict,
        "attacks_total": len(attack_cases),
        "attacks_held_for_review": len(attacks_held),
        "cases": cases,
    }
