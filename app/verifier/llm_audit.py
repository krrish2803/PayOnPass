"""Layer 3 of verification: the bounded LLM audit over soft criteria only.

The audit NEVER outputs a numeric score. It can only pass/fail its own criteria,
optionally veto a pass, or flag injection. It can never raise a score.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List

from pydantic import BaseModel, Field

from app.agents.prompts import LLM_AUDIT_SYSTEM_PROMPT
from app.errors import ArtifactRejected
from app.llm.provider import LLMClient
from app.verifier.injection import escape_delimiters

logger = logging.getLogger("payonpass.llm_audit")


class AuditCriterion(BaseModel):
    id: str
    pass_: bool = Field(alias="pass")
    reason: str = ""


class AuditOutput(BaseModel):
    criteria: List[AuditCriterion] = []
    veto: bool = False
    veto_reason: str | None = None
    injection_suspected: bool = False
    injection_evidence: str | None = None


def _empty_audit(llm_criteria: List[Dict[str, Any]], msg: str) -> Dict[str, Any]:
    return {
        "criteria": [{"id": c["id"], "pass": True, "reason": msg} for c in llm_criteria],
        "veto": False,
        "veto_reason": None,
        "injection_suspected": False,
        "injection_evidence": None,
        "audit_ran": False,
    }


async def run_bounded_llm_audit(
    artifact_content: str,
    llm_criteria: List[Dict[str, Any]],
    llm: LLMClient | None = None,
    retries: int = 1,
    system_prompt: str = LLM_AUDIT_SYSTEM_PROMPT,
) -> Dict[str, Any]:
    """
    Returns a normalized audit result. audit_ran=False means the LLM was not
    configured (offline fallback) — result labelled honestly.
    """
    if llm is None:
        llm = LLMClient()
    if not llm_criteria:
        return _empty_audit(llm_criteria, "no soft criteria")
    if not llm.configured:
        return _empty_audit(llm_criteria, "offline audit: LLM provider not configured")

    allowed_ids = {c["id"] for c in llm_criteria}
    delimited = f"<artifact>{escape_delimiters(artifact_content)}</artifact>"
    payload = {
        "text": "CRITERIA (JSON):\n"
        + json.dumps([{"id": c["id"], "rubric": c.get("rubric", "")} for c in llm_criteria])
        + f"\n\nARTIFACT:\n{delimited}",
    }

    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            raw = await llm.complete_json(system_prompt, payload)
            out = AuditOutput.model_validate(raw)
            break
        except Exception as e:
            last_error = e
            logger.warning("llm audit attempt %d failed: %s", attempt + 1, e)
    else:
        raise ArtifactRejected(
            f"AUDIT_ERROR: LLM audit returned invalid output after {retries + 1} attempts: {last_error}"
        )

    # Sanitize: drop/ignore anything not a declared soft criterion.
    normalized = []
    for c in out.criteria:
        if c.id in allowed_ids:
            normalized.append({"id": c.id, "pass": bool(c.pass_), "reason": c.reason})
    return {
        "criteria": normalized,
        "veto": bool(out.veto),
        "veto_reason": out.veto_reason,
        "injection_suspected": bool(out.injection_suspected),
        "injection_evidence": out.injection_evidence,
        "audit_ran": True,
    }