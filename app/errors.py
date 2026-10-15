class PayOnPassError(Exception):
    """Base error for the application."""


class IllegalTransition(PayOnPassError):
    def __init__(self, current: str, target: str):
        self.current = current
        self.target = target
        super().__init__(f"Illegal state transition: {current} -> {target}")


class LostRace(PayOnPassError):
    """A compare-and-set update matched zero documents (lost race or missing doc)."""


class JobNotFound(PayOnPassError):
    pass


class ArtifactRejected(PayOnPassError):
    pass


class GuardrailRejected(PayOnPassError):
    pass


class MatrixValidationError(PayOnPassError):
    pass


class AuctionMatrixError(MatrixValidationError):
    pass


class PayPalError(PayOnPassError):
    """Base for client-side PayPal errors."""

    def __init__(self, status_code: int, body: dict, debug_id: str = ""):
        self.status_code = status_code
        self.body = body
        self.debug_id = debug_id
        super().__init__(f"PayPal {status_code} {debug_id}: {body}")


class PayPalTransientError(PayPalError):
    """Timeout, 5xx, or 429 — safe to retry with the same request id."""


class PayPalPermanentError(PayPalError):
    """Other 4xx — do not retry; send the job to NEEDS_REVIEW."""


class PayPalAuthError(PayPalPermanentError):
    pass