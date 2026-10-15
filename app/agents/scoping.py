"""Scoping agent: plain-English prompt -> validated AcceptanceMatrix.

When no LLM API key is configured, falls back to a canonical offline demo matrix
and the returned source explicitly says so (honest, never silent).
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Tuple

from app.agents.prompts import SCOPING_SYSTEM_PROMPT
from app.errors import MatrixValidationError
from app.llm.provider import LLMClient
from app.models import AcceptanceMatrix

logger = logging.getLogger("payonpass.scoping")

DEMO_MATRIX: Dict[str, Any] = {
    "job_title": "5 product descriptions",
    "price_cents": 2000,
    "currency": "USD",
    "deliverable_format": "json",
    "criteria": [
        {
            "id": "schema",
            "description": "Deliverable is a JSON array of objects with title and description",
            "kind": "rule",
            "type": "json_schema",
            "schema_ref": "descriptions_v1",
            "gate": True,
            "weight_bp": 2000,
        },
        {
            "id": "length",
            "description": "Every description is 90 to 110 words",
            "kind": "rule",
            "type": "word_count_each",
            "min": 90,
            "max": 110,
            "gate": True,
            "weight_bp": 2000,
        },
        {
            "id": "terms",
            "description": "Descriptions contain the words organic and cotton",
            "kind": "rule",
            "type": "required_terms",
            "terms": ["organic", "cotton"],
            "gate": False,
            "weight_bp": 2000,
        },
        {
            "id": "tone",
            "description": "Professional tone, no exaggerated claims",
            "kind": "llm",
            "rubric": "Professional tone, no exaggerated claims",
            "gate": False,
            "weight_bp": 2000,
        },
        {
            "id": "coverage",
            "description": "All five descriptions are about the organic cotton T-shirt shop",
            "kind": "llm",
            "rubric": "All five descriptions are about the organic cotton T-shirt shop",
            "gate": False,
            "weight_bp": 2000,
        },
    ],
}


def get_demo_matrix() -> Dict[str, Any]:
    return DEMO_MATRIX


def validate_matrix(raw: Dict[str, Any]) -> Dict[str, Any]:
    try:
        return AcceptanceMatrix.model_validate(raw).model_dump(mode="json")
    except Exception as e:
        raise MatrixValidationError(f"Invalid acceptance matrix: {e}") from e


async def generate_acceptance_matrix(
    prompt: str,
    price_cents: int | None = None,
    llm: LLMClient | None = None,
    retries: int = 1,
) -> Tuple[Dict[str, Any], str]:
    """
    Returns (matrix, source). source is "online:<provider>" or "offline-demo".
    Raises MatrixValidationError when the LLM is unhelpful.
    """
    if llm is None:
        llm = LLMClient()
    if not llm.configured:
        matrix = get_demo_matrix()
        if price_cents is not None:
            matrix["price_cents"] = price_cents
        return matrix, "offline-demo"

    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            raw = await llm.complete_json(
                SCOPING_SYSTEM_PROMPT,
                {"text": f"CLIENT REQUEST: {prompt}"},
            )
            matrix = validate_matrix(raw)
            if price_cents is not None:
                matrix["price_cents"] = price_cents
            return matrix, f"online:{llm.provider}"
        except Exception as e:  # LLMError, validation errors
            last_error = e
            logger.warning("scoping attempt %d failed: %s", attempt + 1, e)
    raise MatrixValidationError(f"LLM returned an invalid matrix after {retries + 1} attempts: {last_error}")