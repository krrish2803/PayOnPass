import pytest
from app.state_machine import JobState, can_transition, validate_transition
from app.errors import IllegalTransition

def test_legal_transitions():
    assert can_transition(JobState.CREATED, JobState.FUNDED)
    assert can_transition(JobState.FUNDED, JobState.DELIVERED)
    assert can_transition(JobState.DELIVERED, JobState.AUDITING)
    assert can_transition(JobState.AUDITING, JobState.SETTLING)
    assert can_transition(JobState.AUDITING, JobState.NEEDS_REVIEW)
    assert can_transition(JobState.NEEDS_REVIEW, JobState.SETTLING)
    assert can_transition(JobState.SETTLING, JobState.SETTLED)
    assert can_transition(JobState.SETTLING, JobState.REFUNDED)

def test_illegal_transitions():
    with pytest.raises(IllegalTransition):
        validate_transition(JobState.CREATED, JobState.SETTLED)

    with pytest.raises(IllegalTransition):
        validate_transition(JobState.SETTLED, JobState.FUNDED)

    with pytest.raises(IllegalTransition):
        validate_transition(JobState.REFUNDED, JobState.DELIVERED)
