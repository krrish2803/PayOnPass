import pytest
from app.verifier.scoring import calculate_settlement_amounts

def test_settlement_math_identity():
    # Test random prices and score ranges
    test_cases = [
        (2000, 10000), # $20 full pass
        (2000, 6000),  # $20 partial (60%)
        (2000, 3000),  # $20 fail (30%)
        (1575, 7500),  # odd cents
        (9999, 8500),  # edge cents
        (100, 5000),   # $1.00
    ]

    for price, score_bp in test_cases:
        res = calculate_settlement_amounts(price, score_bp)
        assert res["worker_payout"] + res["client_refund"] + res["fee"] == price
        assert res["worker_payout"] >= 0
        assert res["client_refund"] >= 0
        assert res["fee"] >= 0

def test_demo_job_math():
    # $20 with 60% score
    res = calculate_settlement_amounts(2000, 6000, fee_rate_bp=1000)
    assert res["share"] == 1200
    assert res["fee"] == 120
    assert res["worker_payout"] == 1080
    assert res["client_refund"] == 800
    assert res["worker_payout"] + res["client_refund"] + res["fee"] == 2000
