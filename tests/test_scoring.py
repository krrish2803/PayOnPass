from app.verifier.scoring import calculate_score_bp, decide_outcome

def test_score_calculation():
    matrix = {
        "criteria": [
            {"id": "c1", "weight": 0.2, "weight_bp": 2000},
            {"id": "c2", "weight": 0.3, "weight_bp": 3000},
            {"id": "c3", "weight": 0.5, "weight_bp": 5000},
        ]
    }
    results = {"c1": True, "c2": True, "c3": False}
    score = calculate_score_bp(results, matrix)
    assert score == 5000  # 50%

def test_decide_outcome_pass():
    decision, reason = decide_outcome(score_bp=9000, failed_gates=[], veto=False, injection_suspected=False)
    assert decision == "PASS"

def test_decide_outcome_injection():
    decision, reason = decide_outcome(score_bp=10000, failed_gates=[], veto=False, injection_suspected=True)
    assert decision == "NEEDS_REVIEW"
    assert reason == "SUSPECTED_INJECTION"
