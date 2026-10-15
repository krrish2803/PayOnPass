from typing import List, Optional, Any, Dict, Literal
from pydantic import BaseModel, Field, field_validator

RuleType = Literal["json_schema", "word_count_each", "word_count_total", "required_terms", "regex_all", "regex_none", "max_chars"]


class Criterion(BaseModel):
    id: str
    description: str = ""
    kind: Literal["rule", "llm"]
    weight_bp: int = Field(..., ge=1, le=10000)
    gate: bool = False
    # Rule spec (kind == "rule")
    type: Optional[RuleType] = None
    schema_ref: Optional[str] = None
    min: Optional[int] = None
    max: Optional[int] = None
    terms: Optional[List[str]] = None
    patterns: Optional[List[str]] = None
    # Soft spec (kind == "llm")
    rubric: Optional[str] = None

    @field_validator("rubric")
    @classmethod
    def rubric_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 200:
            raise ValueError("rubric must be at most 200 characters")
        return v


class AcceptanceMatrix(BaseModel):
    job_title: str
    price_cents: int = Field(..., ge=1)
    currency: str = "USD"
    deliverable_format: str = "json"
    criteria: List[Criterion] = Field(..., min_length=1, max_length=8)

    @field_validator("criteria")
    @classmethod
    def weights_and_gates(cls, criteria: List[Criterion]) -> List[Criterion]:
        total = sum(c.weight_bp for c in criteria)
        if total != 10000:
            raise ValueError(f"criteria weights must sum to exactly 10000 bp, got {total}")
        for c in criteria:
            if c.gate and c.kind != "rule":
                raise ValueError(f"gate criterion '{c.id}' must be of kind 'rule', not 'llm'")
            if c.kind == "rule" and c.type is None:
                raise ValueError(f"rule criterion '{c.id}' requires a rule type")
        return criteria


class CreateJobRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    title: Optional[str] = None
    price_cents: Optional[int] = Field(None, ge=1)
    worker_email: Optional[str] = None
    # Left unset so each surface can pick its own default: the human console
    # defaults to "human", the agent API to "agent".
    worker_kind: Optional[str] = None
    buyer_ref: Optional[str] = None


class FundResponse(BaseModel):
    job_id: str
    state: str
    approval_url: Optional[str] = None
    mode: str


class SubmitDeliverableRequest(BaseModel):
    content: str = Field(..., min_length=1)
    submitted_by: Optional[str] = "worker"


class ReviewDecisionRequest(BaseModel):
    decision: Literal["APPROVE", "ADJUST", "REJECT"]
    score_bp: Optional[int] = Field(None, ge=0, le=10000)
    note: Optional[str] = None


class MoneyEventOut(BaseModel):
    job_id: str
    kind: str
    status: str
    request_id: str
    amount_cents: int
    paypal_ids: List[str] = []
    response: Dict[str, Any] = {}


class JobOut(BaseModel):
    id: str
    state: str
    review_reason: Optional[str] = None
    title: Optional[str] = None
    prompt: str
    price_cents: int
    currency: str = "USD"
    matrix: Optional[Dict[str, Any]] = None
    worker_email: Optional[str] = None
    worker_kind: Optional[str] = None
    paypal: Dict[str, Any] = {}
    version: int = 1
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class DecisionOut(BaseModel):
    job_id: str
    state: str
    receipt: Optional[Dict[str, Any]] = None
    error: Optional[str] = None