"""Provider-agnostic LLM client.

Providers: gemini (default), openai, anthropic. The model runs at temperature 0
and is asked for structured JSON. Output is validated by the caller with Pydantic;
a malformed response causes exactly one retry, then failure.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

import httpx

from app.config import settings

logger = logging.getLogger("payonpass.llm")

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"
OPENAI_BASE = "https://api.openai.com/v1"
ANTHROPIC_BASE = "https://api.anthropic.com/v1"


class LLMError(Exception):
    pass


class LLMClient:
    def __init__(self, provider: Optional[str] = None, model: Optional[str] = None, api_key: Optional[str] = None):
        self.provider = (provider or settings.LLM_PROVIDER).lower()
        self.model = model or settings.effective_model
        self.api_key = api_key if api_key is not None else settings.effective_api_key
        self.http = httpx.AsyncClient(timeout=60.0)

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    async def aclose(self):
        await self.http.aclose()

    async def complete_json(self, system: str, user: Dict[str, Any]) -> Dict[str, Any]:
        """Run the model at temperature 0 and parse the structured JSON reply."""
        text = user.get("text", "")
        if self.provider == "gemini":
            if settings.GEMINI_BASE_URL and "/v1" in settings.GEMINI_BASE_URL:
                return await self._gemini_gateway(system, text)
            return await self._gemini(system, text)
        elif self.provider == "openai":
            return await self._openai(system, text)
        elif self.provider == "anthropic":
            return await self._anthropic(system, text)
        raise LLMError(f"unsupported LLM_PROVIDER: {self.provider}")

    async def _gemini_gateway(self, system: str, user_text: str) -> Dict[str, Any]:
        """Gemini via an OpenAI-compatible gateway (GEMINI_BASE_URL ends in /v1/.../openai/)."""
        base = settings.GEMINI_BASE_URL.rstrip("/")
        url = f"{base}/chat/completions"
        body = {
            "model": self.model,
            "temperature": 0,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user_text}],
            "response_format": {"type": "json_object"},
        }
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        r = await self.http.post(url, json=body, headers=headers)
        if r.status_code != 200:
            raise LLMError(f"gemini-gateway {r.status_code}: {r.text[:300]}")
        data = r.json()
        content = data["choices"][0]["message"]["content"]
        return _parse_json(content)

    async def _gemini(self, system: str, user_text: str) -> Dict[str, Any]:
        url = f"{GEMINI_BASE}/models/{self.model}:generateContent"
        body = {
            "contents": [{"role": "user", "parts": [{"text": f"{system}\n\n{user_text}"}]}],
            "generationConfig": {
                "temperature": 0,
                "responseMimeType": "application/json",
            },
        }
        headers = {"x-goog-api-key": self.api_key, "Content-Type": "application/json"}
        r = await self.http.post(url, json=body, headers=headers)
        if r.status_code != 200:
            raise LLMError(f"gemini {r.status_code}: {r.text[:300]}")
        data = r.json()
        candidates = data.get("candidates") or []
        if not candidates:
            raise LLMError("gemini returned no candidates")
        text = candidates[0]["content"]["parts"][0]["text"]
        return _parse_json(text)

    async def _openai(self, system: str, user_text: str) -> Dict[str, Any]:
        url = f"{OPENAI_BASE}/chat/completions"
        body = {
            "model": self.model,
            "temperature": 0,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user_text}],
            "response_format": {"type": "json_object"},
        }
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        r = await self.http.post(url, json=body, headers=headers)
        if r.status_code != 200:
            raise LLMError(f"openai {r.status_code}: {r.text[:300]}")
        data = r.json()
        content = data["choices"][0]["message"]["content"]
        return _parse_json(content)

    async def _anthropic(self, system: str, user_text: str) -> Dict[str, Any]:
        url = f"{ANTHROPIC_BASE}/messages"
        body = {
            "model": self.model,
            "max_tokens": 2048,
            "temperature": 0,
            "system": system,
            "messages": [{"role": "user", "content": user_text}],
        }
        headers = {"x-api-key": self.api_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"}
        r = await self.http.post(url, json=body, headers=headers)
        if r.status_code != 200:
            raise LLMError(f"anthropic {r.status_code}: {r.text[:300]}")
        data = r.json()
        text = "".join(block.get("text", "") for block in data["content"])
        return _parse_json(text)


def _parse_json(text: str) -> Dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise LLMError(f"model returned invalid JSON: {e}") from e