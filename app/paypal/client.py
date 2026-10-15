"""Async PayPal Sandbox client.

Errors:
- PayPalTransientError  (timeout/5xx/429 after retries) -> money event UNKNOWN,
  the reconcoler resolves it by querying PayPal, never by blind retry.
- PayPalPermanentError  (other 4xx) -> money event FAILED, job -> NEEDS_REVIEW.

Every mutating call sends a deterministic PayPal-Request-Id so a retry cannot
move money twice. Secrets/tokens are never logged.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings
from app.errors import PayPalPermanentError, PayPalTransientError
from app.money import money, request_id, to_cents

logger = logging.getLogger("payonpass.paypal")

TRANSIENT_STATUS = {429, 500, 502, 503, 504}
MAX_ATTEMPTS = 4  # initial + up to 3 retries, always reusing the same request id


def _backoff(attempt: int) -> float:
    return 0.25 * (2**attempt)


class PayPalClient:
    def __init__(
        self,
        client_id: Optional[str] = None,
        secret: Optional[str] = None,
        base_url: Optional[str] = None,
        public_base_url: Optional[str] = None,
        http: Optional[httpx.AsyncClient] = None,
    ):
        self.client_id = client_id or settings.PAYPAL_CLIENT_ID
        self.secret = secret or settings.PAYPAL_CLIENT_SECRET
        self.base_url = base_url or settings.PAYPAL_BASE_URL
        self.public_base_url = public_base_url or settings.PUBLIC_BASE_URL
        self.http = http or httpx.AsyncClient(base_url=self.base_url, timeout=20.0)
        self._token: Optional[str] = None
        self._expires: float = 0.0

    async def aclose(self):
        await self.http.aclose()

    # ---- auth ----
    async def _access_token(self) -> str:
        if not self._token or self._expires < __import__("time").time() - 60:
            r = await self.http.post(
                "/v1/oauth2/token",
                auth=(self.client_id, self.secret),
                data={"grant_type": "client_credentials"},
            )
            if r.status_code != 200:
                raise PayPalPermanentError(r.status_code, _body(r), _debug_id(r))
            body = r.json()
            self._token = body["access_token"]
            self._expires = __import__("time").time() + float(body.get("expires_in", 3600))
        return self._token

    def _headers(self, token: str, with_request_id: Optional[str] = None) -> Dict[str, str]:
        h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        if with_request_id:
            h["PayPal-Request-Id"] = with_request_id
        return h

    # ---- core verbs with retry ----
    async def _post(self, path: str, job_id: str, action: str, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        rid = request_id(job_id, action)
        last_error: Exception | None = None
        for attempt in range(MAX_ATTEMPTS):
            try:
                token = await self._access_token()
                r = await self.http.post(path, headers=self._headers(token, rid), json=body)
                return self._classify_and_payload(r)
            except PayPalPermanentError:
                raise
            except PayPalTransientError as e:
                last_error = e
                logger.warning("transient %s on %s (attempt %d)", e.status_code, path, attempt + 1)
            except (httpx.TimeoutException, httpx.TransportError) as e:
                last_error = e
                logger.warning("transport error on %s (attempt %d): %r", path, attempt + 1, e)
            if attempt < MAX_ATTEMPTS - 1:
                await asyncio.sleep(_backoff(attempt))
        raise PayPalTransientError(-1, {"error": f"transient failure after {MAX_ATTEMPTS} attempts: {last_error}"}, "")

    async def _get(self, path: str) -> Dict[str, Any]:
        for attempt in range(MAX_ATTEMPTS):
            try:
                token = await self._access_token()
                r = await self.http.get(path, headers=self._headers(token))
                return self._classify_and_payload(r)
            except PayPalPermanentError:
                raise
            except (PayPalTransientError, httpx.TimeoutException, httpx.TransportError) as e:
                logger.warning("transient GET %s (attempt %d): %r", path, attempt + 1, e)
            if attempt < MAX_ATTEMPTS - 1:
                await asyncio.sleep(_backoff(attempt))
        raise PayPalTransientError(-1, {"error": "transient GET failure"}, "")

    @staticmethod
    def _classify_and_payload(r: httpx.Response) -> Dict[str, Any]:
        if r.status_code >= 200 and r.status_code < 300:
            return r.json()
        did = _debug_id(r)
        if r.status_code in TRANSIENT_STATUS:
            raise PayPalTransientError(r.status_code, _body(r), did)
        raise PayPalPermanentError(r.status_code, _body(r), did)

    # ---- API surface ----
    def return_url(self, job_id: str) -> str:
        return f"{self.public_base_url}/paypal/return?job_id={job_id}"

    def cancel_url(self, job_id: str) -> str:
        return f"{self.public_base_url}/paypal/cancel?job_id={job_id}"

    async def create_order(self, job_id: str, cents: int, currency: str = "USD") -> Dict[str, Any]:
        return_url = self.return_url(job_id)
        cancel_url = self.cancel_url(job_id)
        return await self._post(
            "/v2/checkout/orders",
            job_id,
            "create_order",
            {
                "intent": "CAPTURE",
                "purchase_units": [
                    {
                        "reference_id": job_id,
                        "custom_id": job_id,
                        "amount": {"currency_code": currency, "value": money(cents)},
                    }
                ],
                "payment_source": {
                    "paypal": {
                        "experience_context": {
                            "return_url": return_url,
                            "cancel_url": cancel_url,
                            "user_action": "PAY_NOW",
                        }
                    }
                },
            },
        )

    async def get_order(self, order_id: str) -> Dict[str, Any]:
        return await self._get(f"/v2/checkout/orders/{order_id}")

    async def capture_order(self, job_id: str, order_id: str) -> Dict[str, Any]:
        return await self._post(f"/v2/checkout/orders/{order_id}/capture", job_id, "capture")

    async def create_payout_batch(self, job_id: str, email: str, cents: int) -> Dict[str, Any]:
        return await self._post(
            "/v1/payments/payouts",
            job_id,
            "payout",
            {
                "sender_batch_header": {
                    "sender_batch_id": f"settle-{job_id}",
                    "email_subject": "You were paid through PayOnPass",
                },
                "items": [
                    {
                        "recipient_type": "EMAIL",
                        "receiver": email,
                        "amount": {"value": money(cents), "currency": "USD"},
                        "sender_item_id": job_id,
                        "note": f"Job {job_id}",
                    }
                ],
            },
        )

    async def get_payout_batch(self, batch_id: str) -> Dict[str, Any]:
        return await self._get(f"/v1/payments/payouts/{batch_id}")

    async def list_payouts(self, sender_batch_id: str) -> Optional[Dict[str, Any]]:
        """Search payout batches by their deterministic sender_batch_id (the
        reconciler's recovery lookup for requests that died before a response)."""
        r = await self._get(
            f"/v1/payments/payouts?page_size=5&sender_batch_id={sender_batch_id}"
        )
        items = r.get("items") or []
        return items[0] if items else None

    async def refund_capture(self, job_id: str, capture_id: str, cents: Optional[int] = None) -> Dict[str, Any]:
        body = None if cents is None else {"amount": {"value": money(cents), "currency_code": "USD"}}
        return await self._post(f"/v2/payments/captures/{capture_id}/refund", job_id, "refund", body)

    async def get_refund(self, refund_id: str) -> Dict[str, Any]:
        return await self._get(f"/v2/payments/refunds/{refund_id}")

    async def verify_webhook_signature(self, webhook_event: Dict[str, Any], transmission_id: str,
                                       transmission_time: str, transmission_sig: str, cert_url: str,
                                       auth_algo: str) -> bool:
        body = {
            "transmission_id": transmission_id,
            "transmission_time": transmission_time,
            "transmission_sig": transmission_sig,
            "cert_url": cert_url,
            "auth_algo": auth_algo,
            "webhook_id": settings.PAYPAL_WEBHOOK_ID,
            "webhook_event": webhook_event,
        }
        res = await self._post("/v1/notifications/verify-webhook-signature", "webhook", "verify_signature", body)
        return res.get("verification_status") == "SUCCESS"

    def approval_url(self, order: Dict[str, Any]) -> Optional[str]:
        for link in order.get("links", []):
            if link.get("rel") in ("payer-action", "approve"):
                return link.get("href")
        return None


def _body(r: httpx.Response) -> Dict[str, Any]:
    try:
        return r.json()
    except Exception:
        return {"text": r.text}


def _debug_id(r: httpx.Response) -> str:
    return r.headers.get("PayPal-Debug-Id", "")


def extract_capture_ids(capture_response: Dict[str, Any]) -> List[str]:
    """Collect PayPal capture ids from an order-capture response."""
    out: List[str] = []
    for pu in capture_response.get("purchase_units", []):
        cap = pu.get("payments", {}).get("captures", [])
        for c in cap:
            if c.get("id"):
                out.append(c["id"])
    return out


def capture_summary(capture_response: Dict[str, Any]) -> Dict[str, Any]:
    """Extract capture_id, gross amount and PayPal's own fee (in cents) from an
    order-capture response. The PayPal fee comes from seller_receivable_breakdown
    and is a separate cost line — it is never folded into the settlement identity."""
    captures = (
        ((capture_response or {}).get("purchase_units") or [{}])[0]
        .get("payments", {})
        .get("captures", [])
    )
    cap = captures[0] if captures else {}
    breakdown = cap.get("seller_receivable_breakdown") or {}
    gross = (cap.get("amount") or {}).get("value")
    fee = (breakdown.get("paypal_fee") or {}).get("value")
    return {
        "capture_id": cap.get("id"),
        "gross_cents": to_cents(gross),
        "paypal_fee_cents": to_cents(fee),
    }