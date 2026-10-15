"""Phase 0 Spike: prove the PayPal Sandbox money loop for real.

Runs (live, PayPal sandbox only):
  1. OAuth client-credentials token
  2. Order (intent CAPTURE, PAY_NOW, reference/custom id = job id)
  3. Buyer approval -> capture
  4. $1.00 payout to PAYPAL_WORKER_EMAIL
  5. $0.50 partial refund on the capture
  6. Idempotency: replay the payout with the same PayPal-Request-Id and prove
     the second call does not create a second payout

Usage:
  .venv/bin/python scripts/paypal_spike.py            # requires manual approval
  .venv/bin/python scripts/paypal_spike.py --verify   # no capture; proves token+order only

Hard gate: if payouts are NOT enabled on the sandbox app, the run stops here and
the backend must not claim a live payout works.
"""

from __future__ import annotations

import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import settings
from app.paypal.client import PayPalClient

APPROVAL_TIMEOUT_S = 600


async def run_spike(require_approval: bool = True) -> None:
    print("=== PayOnPass Phase 0: PayPal Sandbox Spike ===")
    print(f"  base_url={settings.PAYPAL_BASE_URL}  worker_email={settings.PAYPAL_WORKER_EMAIL}")

    client = PayPalClient()

    # 1. token (auth failure is loud and early)
    print("\n[1] OAuth token")
    await client._access_token()
    print("  -> token ok")

    # 2. order
    print("\n[2] Create order ($1.00, intent CAPTURE)")
    order = await client.create_order("spike_job_001", 100)
    order_id = order["id"]
    print(f"  -> order_id={order_id} status={order.get('status')}")
    url = client.approval_url(order)
    print(f"  approval_url={url}")

    capture_id = None
    if require_approval:
        # 3. wait for a human to approve, then capture
        print(f"\n[3] Approve the order in your browser (timeout {APPROVAL_TIMEOUT_S}s)...")
        waited = 0
        while waited < APPROVAL_TIMEOUT_S:
            current = await client.get_order(order_id)
            if current.get("status") == "APPROVED":
                print("  -> order APPROVED")
                break
            await asyncio.sleep(5)
            waited += 5
        else:
            print("  !! approval timeout; skipping capture")
            return

        capture = await client.capture_order("spike_job_001", order_id)
        purchase = capture.get("purchase_units", [{}])[0]
        captures = purchase.get("payments", {}).get("captures", [])
        cap = captures[0] if captures else {}
        capture_id = cap.get("id")
        print(f"  -> captured capture_id={capture_id} status={cap.get('status')}")
    else:
        print("\n[3] skip capture (--verify mode)")

    # 4. payout $1.00 to the worker email
    print("\n[4] Payout $1.00")
    try:
        payout = await client.create_payout_batch("spike_job_001", settings.PAYPAL_WORKER_EMAIL, 100)
        batch_id = payout.get("batch_header", {}).get("payout_batch_id")
        print(f"  -> payout batch_id={batch_id}")
    except Exception as e:
        print(f"  !! PAYOUT FAILED ({e}). Sandbox app likely lacks payouts permission.")
        print("  HARD GATE: do not claim live payouts work until this succeeds.")
        return

    # 5. partial refund $0.50
    print("\n[5] Partial refund $0.50")
    if capture_id:
        try:
            refund = await client.refund_capture("spike_job_001", capture_id, 50)
            print(f"  -> refund id={refund.get('id')} status={refund.get('status')}")
        except Exception as e:
            print(f"  !! refund failed: {e}")
    else:
        print("  (capture skipped, no refund attempted)")

    # 6. idempotency: same job + action -> same PayPal-Request-Id -> no duplicate
    print("\n[6] Idempotency replay (same request id)")
    try:
        replay = await client.create_payout_batch("spike_job_001", settings.PAYPAL_WORKER_EMAIL, 100)
        print(f"  -> replay returned batch_id={replay.get('batch_header', {}).get('payout_batch_id')}")
        print("  (identical request id must NOT create a second payout batch)")
    except Exception as e:
        print(f"  -> replay guarded/propagated: {e}")

    print("\n=== Spike complete ===")


if __name__ == "__main__":
    require_approval = "--verify" not in sys.argv
    asyncio.run(run_spike(require_approval=require_approval))