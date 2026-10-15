import pytest
from mongomock_motor import AsyncMongoMockClient


@pytest.fixture(autouse=True)
def mock_mongo(monkeypatch):
    """Point app.db at an in-memory MongoDB so lifespan + repos work offline."""
    from app import db as dbmod

    client = AsyncMongoMockClient()
    mdb = client["test"]
    monkeypatch.setattr(dbmod, "_client", client)
    monkeypatch.setattr(dbmod, "_db", mdb)
    yield mdb


@pytest.fixture
def app_client(mock_mongo, monkeypatch):
    """Full FastAPI TestClient with a scriptable PayPal + LLM and prefunded mode."""
    from fastapi.testclient import TestClient

    from app.api import deps
    from app.config import settings
    from app.main import app
    from tests.fakes import FakePayPal, ScriptedLLM

    fake_paypal = FakePayPal()
    fake_llm = ScriptedLLM()
    app.dependency_overrides[deps.get_paypal] = lambda: fake_paypal
    app.dependency_overrides[deps.get_llm] = lambda: fake_llm
    monkeypatch.setattr(settings, "FUNDING_MODE", "prefunded")

    with TestClient(app) as client:
        yield {
            "client": client,
            "paypal": fake_paypal,
            "llm": fake_llm,
        }
    app.dependency_overrides.clear()