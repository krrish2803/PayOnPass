"""PayPal webhook signature verification (async)."""

from __future__ import annotations

from typing import Dict

from app.paypal.client import PayPalClient


class WebhookVerifier:
    def __init__(self, client: PayPalClient | None = None):
        self.client = client or PayPalClient()

    async def verify(
        self,
        webhook_event: Dict,
        transmission_id: str,
        transmission_time: str,
        transmission_sig: str,
        cert_url: str,
        auth_algo: str,
    ) -> bool:
        """Returns True only when PayPal's verify-webhook-signature says SUCCESS."""
        try:
            return await self.client.verify_webhook_signature(
                webhook_event,
                transmission_id,
                transmission_time,
                transmission_sig,
                cert_url,
                auth_algo,
            )
        except Exception:
            return False