# PayOnPass: Technical Architecture

## Overview
PayOnPass is a verify-before-release payment gateway that holds captured funds in a PayPal Sandbox balance, evaluates submitted digital work artifacts against deterministic rules and a bounded LLM audit, and automatically releases payouts or refunds based on machine-checkable criteria.

## Pipeline Flow
```
Client Request -> Scoping Agent -> Acceptance Matrix JSON (Price + Hard Gates + LLM Rubrics)
       |
PayPal Orders Capture ($)
       |
Worker Deliverable Submission
       |
Verifier Layer 1 (Python Hard Gates: Regex, Schema, Word Count, Max Chars)
       |
Verifier Injection Scan (Regex Pattern Scanner)
       |
Verifier Layer 2 (Bounded LLM Audit at Temperature 0)
       |
Scoring Engine (Deterministic Python Basis Points Calculation)
       |
Tamper-Evident Receipt Sealing (SHA-256 Hash Chain)
       |
Settlement Engine (PayPal Payouts & Refunds with Idempotent Request-IDs)
```

## Security & Accounting Invariants
1. **Receipt Before Money:** No PayPal endpoint is ever invoked without a pre-computed and stored cryptographic receipt.
2. **Rules Beat the Model:** Hard gates cannot be overridden by the LLM.
3. **Integer Cent Math:** `worker_payout + client_refund + platform_fee == price_cents`.
4. **Idempotency:** Every PayPal mutation transmits `PayPal-Request-Id = SHA256(job_id + ":" + action)`.
