from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AliasChoices


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=True,
    )

    # PayPal Sandbox
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_CLIENT_SECRET: str = ""
    PAYPAL_BASE_URL: str = "https://api-m.sandbox.paypal.com"
    PAYPAL_WORKER_EMAIL: str = "sandbox-worker@example.com"
    PAYPAL_WEBHOOK_ID: str = ""

    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "payonpass"

    # LLM (provider-agnostic). `API_KEY`/`MODEL` fall back to the GEMINI_* vars
    # so a single set of credentials wires the default provider.
    LLM_PROVIDER: str = "gemini"
    LLM_MODEL: str = ""
    LLM_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GEMINI_BASE_URL: str = ""
    GEMINI_MODEL: str = ""

    @property
    def effective_api_key(self) -> str:
        return self.LLM_API_KEY or self.GEMINI_API_KEY

    @property
    def effective_model(self) -> str:
        return self.LLM_MODEL or self.GEMINI_MODEL or "gemini-2.5-flash"

    # Platform economics (basis points: 10000 = 100%)
    FEE_RATE_BP: int = Field(default=1000, validation_alias=AliasChoices("FEE_RATE_BP", "PLATFORM_FEE_BP"))
    PASS_BP: int = 8500
    FAIL_BP: int = 5000
    REVIEW_MARGIN_BP: int = 500

    # Spending guardrails (integer cents)
    MAX_JOB_CENTS: int = 50000
    DAILY_CAP_CENTS: int = 200000

    # Funding mode: live (real sandbox buyer approval) | prefunded (seeded captures)
    FUNDING_MODE: str = "live"

    # Settle mode: paypal (real payouts/refunds) | mock (simulated money loop).
    # `mock` is for demos/CI where the merchant country blocks payouts; money
    # events still record mode="prefunded" so the ledger never lies.
    SETTLE_MODE: str = "paypal"

    # Agent API keys (comma separated). Empty disables key checks.
    AGENT_API_KEYS: str = ""

    # Demo/dev affordances (tamper test, one-click scenario runner). Off by
    # default: these mutate receipts and seed jobs, so they must be opt-in.
    ENABLE_DEV_TOOLS: bool = False

    # Server
    PUBLIC_BASE_URL: str = "http://localhost:8000"
    PORT: int = 8000

    # CORS origins for the dashboard (comma separated). "*" allows all (no cookies).
    CORS_ORIGINS: str = "http://localhost:5174,http://localhost:5173,http://localhost:8000"

    @property
    def agent_keys(self) -> List[str]:
        return [k.strip() for k in self.AGENT_API_KEYS.split(",") if k.strip()]

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()