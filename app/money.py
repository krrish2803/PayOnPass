import hashlib

# Money is integer cents everywhere. Never floats at the boundary.

def money(cents: int) -> str:
    """Format integer cents as a 2-decimal USD string for PayPal."""
    if cents < 0:
        return f"-{money(-cents)}"
    return f"{cents // 100}.{cents % 100:02d}"


def to_cents(value: str | None) -> int | None:
    """Parse a PayPal USD string (e.g. '20.00') back to integer cents."""
    if value is None:
        return None
    try:
        whole, _, frac = str(value).strip().partition(".")
        frac = (frac + "00")[:2]
        return int(whole) * 100 + int(frac or "0")
    except (ValueError, TypeError):
        return None


def request_id(job_id: str, action: str) -> str:
    """Deterministic idempotency key: same job + same action = same key."""
    return hashlib.sha256(f"{job_id}:{action}".encode()).hexdigest()


def round_half_up(numerator: int, denominator: int) -> int:
    """Integer rounding half up: round_half_up(a, b) = round(a / b) with .5 rounding away from zero."""
    return (numerator + denominator // 2) // denominator