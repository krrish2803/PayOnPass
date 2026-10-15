"""Verify the receipt hash chain stored in MongoDB.

Usage:  .venv/bin/python scripts/verify_chain.py
"""

from __future__ import annotations

import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db import get_db
from app.repositories import Repos
from app.verifier.receipt import verify_chain


async def run_verify() -> None:
    repos = Repos.from_db(get_db())
    receipts = await repos.receipts.all_sealed()
    print(f"Verifying {len(receipts)} receipt(s)...")
    if verify_chain(receipts):
        print("SUCCESS: Receipt hash chain is cryptographically intact.")
    else:
        print("INTEGRITY ERROR: Receipt hash chain has been tampered with or corrupted.")


if __name__ == "__main__":
    asyncio.run(run_verify())