"""Test doubles: a scriptable PayPal client and a scriptable LLM."""

from __future__ import annotations

from typing import Any, Dict, List

from app.errors import PayPalPermanentError, PayPalTransientError

DEMO_MATRIX = {
    "job_title": "5 product descriptions",
    "price_cents": 2000,
    "currency": "USD",
    "deliverable_format": "json",
    "criteria": [
        {"id": "schema", "kind": "rule", "type": "json_schema", "gate": True, "weight_bp": 2000},
        {"id": "length", "kind": "rule", "type": "word_count_each", "min": 90, "max": 110, "gate": True, "weight_bp": 2000},
        {"id": "terms", "kind": "rule", "type": "required_terms", "terms": ["organic", "cotton"], "gate": False, "weight_bp": 2000},
        {"id": "tone", "kind": "llm", "rubric": "Professional tone", "gate": False, "weight_bp": 2000},
        {"id": "coverage", "kind": "llm", "rubric": "Covers the shop", "gate": False, "weight_bp": 2000},
    ],
}

def _desc() -> str:
    # ~95 words, within the 90-110 gate
    return "This is a short intro. " + ("organic cotton " * 44) + "thank you."


S1_CONTENT = '[' + ','.join(
    f'{{"title": "Organic Cotton Tee {i}", "description": "{_desc()}"}}' for i in range(1, 6)
) + ']'


class FakePayPal:
    def __init__(self):
        self.order_id_counter = 0
        self.payout_status_error: int | None = None  # status for payout retry-exhaustion
        self.refund_status_error: int | None = None
        self.payout_batch_status = {"batch_status": "SUCCESS", "item_status": "SUCCESS"}  # for reconciler
        self.capture_gross_cents = 2000
        self.capture_fee_cents = 79  # PayPal's own fee, a separate cost line
        self.calls: List[str] = []

    # ---- helper controls ----
    def fail_payout_with_status(self, status: int):
        self.payout_status_error = status

    def fail_payout_transport(self):
        self.payout_status_error = -1  # signal transport-like transient

    # ---- client surface ----
    async def create_order(self, job_id: str, cents: int, currency: str = "USD") -> Dict[str, Any]:
        self.calls.append(f"create_order:{job_id}")
        self.order_id_counter += 1
        oid = f"ORDER-{self.order_id_counter}"
        return {
            "id": oid,
            "status": "CREATED",
            "links": [{"rel": "approve", "href": f"https://sandbox.paypal.com/approve?id={oid}"}],
        }

    def approval_url(self, order: Dict[str, Any]) -> str | None:
        for link in order.get("links", []):
            if link.get("rel") in ("approve", "payer-action"):
                return link["href"]
        return None

    async def capture_order(self, job_id: str, order_id: str) -> Dict[str, Any]:
        self.calls.append(f"capture:{job_id}")
        gross = f"{self.capture_gross_cents // 100}.{self.capture_gross_cents % 100:02d}"
        fee = f"{self.capture_fee_cents // 100}.{self.capture_fee_cents % 100:02d}"
        return {
            "id": order_id,
            "status": "COMPLETED",
            "purchase_units": [
                {
                    "payments": {
                        "captures": [
                            {
                                "id": f"{order_id}-CAP",
                                "status": "COMPLETED",
                                "amount": {"currency_code": "USD", "value": gross},
                                "seller_receivable_breakdown": {
                                    "gross_amount": {"currency_code": "USD", "value": gross},
                                    "paypal_fee": {"currency_code": "USD", "value": fee},
                                },
                            }
                        ]
                    }
                }
            ],
        }

    async def get_order(self, order_id: str) -> Dict[str, Any]:
        self.calls.append(f"get_order:{order_id}")
        return {"id": order_id, "status": "COMPLETED"}

    async def create_payout_batch(self, job_id: str, email: str, cents: int) -> Dict[str, Any]:
        self.calls.append(f"payout:{job_id}:{cents}")
        if self.payout_status_error is not None:
            if self.payout_status_error == -1:
                raise PayPalTransientError(-1, {"error": "connection reset"}, "TEST")
            if 400 <= self.payout_status_error < 500:
                # permanent 4xx (e.g. real PAYOUT_NOT_AVAILABLE country block)
                raise PayPalPermanentError(self.payout_status_error, {"error": "country payout blocked"}, "TEST")
            raise PayPalTransientError(self.payout_status_error, {"error": "upstream failure"}, "TEST")
        return {
            "batch_header": {"payout_batch_id": f"B-{job_id}", "batch_status": "SUCCESS"},
            "items": [{"payout_item_id": f"I-{job_id}", "payout_item_status": "SUCCESS"}],
        }

    async def get_payout_batch(self, batch_id: str) -> Dict[str, Any]:
        self.calls.append(f"get_batch:{batch_id}")
        return {
            "batch_header": {"payout_batch_id": batch_id, "batch_status": self.payout_batch_status["batch_status"]},
            "items": [{"payout_item_id": f"I-{batch_id}", "item_status": self.payout_batch_status["item_status"]}],
        }

    async def list_payouts(self, sender_batch_id: str) -> Dict[str, Any] | None:
        self.calls.append(f"list_payouts:{sender_batch_id}")
        if self.payout_batch_status.get("batch_status") == "UNKNOWN":
            return None
        return {
            "batch_header": {"payout_batch_id": f"B-{sender_batch_id}", "batch_status": self.payout_batch_status["batch_status"]},
            "items": [{"payout_item_id": f"I-{sender_batch_id}", "item_status": self.payout_batch_status["item_status"]}],
        }

    async def refund_capture(self, job_id: str, capture_id: str, cents: int | None = None) -> Dict[str, Any]:
        self.calls.append(f"refund:{job_id}:{cents}")
        if self.refund_status_error is not None:
            raise PayPalTransientError(self.refund_status_error, {"error": "refund failure"}, "TEST")
        return {"id": f"REF-{job_id}", "status": "COMPLETED"}

    async def get_refund(self, refund_id: str) -> Dict[str, Any]:
        self.calls.append(f"get_refund:{refund_id}")
        return {"id": refund_id, "status": "COMPLETED"}

    async def verify_webhook_signature(self, *args, **kwargs) -> bool:
        return True


class ScriptedLLM:
    """Pops a response per complete_json call: 1st = acceptance matrix, 2nd = audit."""

    def __init__(self, audit_all_pass: bool = True):
        self.provider = "scripted"
        self.responses: List[Dict[str, Any]] = []
        self.audit_all_pass = audit_all_pass
        self.audit_flags: List[str] = []  # criterion ids to mark failing
        self.audit_flags_second: List[str] | None = None  # 2nd audit's flags (disagreement)
        self.audit_fail: int = 0  # next N audit turns raise (drives AUDIT_ERROR)
        self.audit_attempts: int = 0
        self.matrix_override: Dict[str, Any] | None = None

    @property
    def configured(self) -> bool:
        return True

    def queue(self, response: Dict[str, Any]):
        self.responses.append(response)

    async def complete_json(self, system: str, user: Dict[str, Any]) -> Dict[str, Any]:
        payload_text = user.get("text", "")
        if "CLIENT REQUEST" in payload_text:
            return self.matrix_override or DEMO_MATRIX
        # audit turn (also used for the second-opinion pass)
        self.audit_attempts += 1
        if self.audit_fail > 0:
            self.audit_fail -= 1
            raise RuntimeError("scripted audit failure")
        flags = self.audit_flags
        if self.audit_attempts >= 2 and self.audit_flags_second is not None:
            flags = self.audit_flags_second
        crits = []
        for row in self._audit_from(payload_text):
            pass_ = row["id"] not in flags
            crits.append({"id": row["id"], "pass": pass_, "reason": "scripted"})
        return {
            "criteria": crits,
            "veto": False,
            "veto_reason": None,
            "injection_suspected": False,
            "injection_evidence": None,
        }

    @staticmethod
    def _audit_from(payload_text: str) -> List[Dict[str, Any]]:
        import json

        start = payload_text.find("CRITERIA (JSON):")
        if start == -1:
            return []
        head = payload_text[start + len("CRITERIA (JSON):"):]
        raw = head[: head.find("\n\nARTIFACT")]
        try:
            return json.loads(raw)
        except Exception:
            return []

    def assert_no_pending(self):
        assert not self.responses, f"unconsumed scripted responses: {self.responses}"