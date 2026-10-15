"""Dashboard + scorecard integration: the built UI is served same-origin and the
verifier scorecard is derived from the adversarial results file (not hand-typed).
"""

from __future__ import annotations


def test_dashboard_is_served_at_app(app_client):
    r = app_client["client"].get("/app/")
    assert r.status_code == 200, r.text
    assert "text/html" in r.headers.get("content-type", "")
    assert "PayOnPass" in r.text or 'id="root"' in r.text


def test_scorecard_reflects_adversarial_results(app_client):
    r = app_client["client"].get("/verifier/scorecard")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["available"] is True, body
    assert body["total"] >= 12, body
    ids = {c["id"] for c in body["cases"]}
    assert {"A1", "A7", "A12"} <= ids
    # every injection case must have been held for review, never auto-passed
    assert body["attacks_total"] >= 1
    assert body["attacks_held_for_review"] == body["attacks_total"]


def test_job_output_includes_matrix_source(app_client):
    r = app_client["client"].post("/jobs", json={"prompt": "5 organic cotton tees", "price_cents": 2000})
    assert r.status_code == 201, r.text
    job_id = r.json()["id"]
    job = app_client["client"].get(f"/jobs/{job_id}").json()
    assert "matrix_source" in job
