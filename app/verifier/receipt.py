import hashlib
import json
from typing import List, Dict, Any

GENESIS = "0" * 64

def canonical(obj: dict) -> bytes:
    """Deterministic JSON serialization for hashing."""
    return json.dumps(obj, sort_keys=True, separators=(',', ':')).encode('utf-8')

def seal(receipt: dict, prev_hash: str) -> dict:
    """Attaches prev_hash and computes the cryptographic SHA-256 seal."""
    body = {**receipt, 'prev_hash': prev_hash}
    body['hash'] = hashlib.sha256(prev_hash.encode('utf-8') + canonical(body)).hexdigest()
    return body

def verify_chain(receipts: List[Dict[str, Any]]) -> bool:
    """Verifies the integrity of the full receipt hash chain from GENESIS.

    'seq' and 'hash' are chain-exempt metadata: 'hash' is the seal under test and
    'seq' is a display-only position attached after sealing.
    """
    prev = GENESIS
    for r in receipts:
        body = {k: v for k, v in r.items() if k not in ('hash', 'seq')}
        if body.get('prev_hash') != prev:
            return False
        expected_hash = hashlib.sha256(prev.encode('utf-8') + canonical(body)).hexdigest()
        if expected_hash != r.get('hash'):
            return False
        prev = r.get('hash')
    return True
