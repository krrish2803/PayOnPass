from enum import Enum
from typing import Set

from app.errors import IllegalTransition


class JobState(str, Enum):
    CREATED = "CREATED"
    FUNDED = "FUNDED"
    DELIVERED = "DELIVERED"
    AUDITING = "AUDITING"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    SETTLING = "SETTLING"
    SETTLED = "SETTLED"
    REFUNDED = "REFUNDED"


class ReviewReason(str, Enum):
    SUSPECTED_INJECTION = "SUSPECTED_INJECTION"
    BORDERLINE = "BORDERLINE"
    AUDIT_ERROR = "AUDIT_ERROR"
    PAYOUT_FAILED = "PAYOUT_FAILED"
    REFUND_FAILED = "REFUND_FAILED"
    GATE_AUDIT_DISAGREE = "GATE_AUDIT_DISAGREE"
    AUDIT_DISAGREE = "AUDIT_DISAGREE"
    CAPTURE_FAILED = "CAPTURE_FAILED"
    MANUAL_REVIEW = "MANUAL_REVIEW"


# Money moves ONLY in SETTLING.
LEGAL_TRANSITIONS: dict[JobState, Set[JobState]] = {
    JobState.CREATED: {JobState.FUNDED, JobState.NEEDS_REVIEW},
    JobState.FUNDED: {JobState.DELIVERED, JobState.NEEDS_REVIEW},
    JobState.DELIVERED: {JobState.AUDITING},
    JobState.AUDITING: {JobState.SETTLING, JobState.NEEDS_REVIEW},
    JobState.NEEDS_REVIEW: {JobState.SETTLING},
    JobState.SETTLING: {JobState.SETTLED, JobState.REFUNDED, JobState.NEEDS_REVIEW},
    JobState.SETTLED: set(),
    JobState.REFUNDED: set(),
}


def can_transition(current: JobState, target: JobState) -> bool:
    return target in LEGAL_TRANSITIONS.get(current, set())


def validate_transition(current: JobState, target: JobState):
    if not can_transition(current, target):
        raise IllegalTransition(current.value, target.value)