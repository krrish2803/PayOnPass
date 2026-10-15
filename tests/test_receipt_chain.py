from app.verifier.receipt import seal, verify_chain, GENESIS

def test_receipt_chain_integrity():
    r1 = seal({"job_id": "job_1", "decision": "PASS"}, GENESIS)
    r2 = seal({"job_id": "job_2", "decision": "PARTIAL"}, r1["hash"])
    r3 = seal({"job_id": "job_3", "decision": "FAIL"}, r2["hash"])

    chain = [r1, r2, r3]
    assert verify_chain(chain) is True

def test_receipt_chain_tamper_detection():
    r1 = seal({"job_id": "job_1", "decision": "PASS"}, GENESIS)
    r2 = seal({"job_id": "job_2", "decision": "PARTIAL"}, r1["hash"])

    # Tamper with r1
    tampered_r1 = dict(r1)
    tampered_r1["decision"] = "FAIL"

    assert verify_chain([tampered_r1, r2]) is False
