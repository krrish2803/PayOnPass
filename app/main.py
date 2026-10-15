"""PayOnPass API — verify-before-release payment gateway.

Lifespan wires the Mongo-backed repos, async PayPal and LLM singletons, ensures
indexes exist, and starts the reconciler loop. All singletons live on
app.state so tests can override the FastAPI dependency functions directly.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pymongo.errors import PyMongoError

from app.api import agents, demo, jobs, ledger, review, scorecard, webhook_route
from app.config import settings
from app.db import close_db, get_db, init_indexes
from app.llm.provider import LLMClient
from app.paypal.client import PayPalClient
from app.reconciler import reconciler_loop
from app.repositories import Repos

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("payonpass")

RECONCILER_INTERVAL_SECONDS = 30.0


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        db = await init_indexes()
    except PyMongoError as e:
        logger.error("Mongo unavailable at startup: %s", e)
        raise
    repos = Repos.from_db(db)
    app.state.repos = repos
    app.state.paypal = PayPalClient()
    app.state.llm = LLMClient()
    app.state.reconciler_task = asyncio.create_task(
        reconciler_loop(repos, app.state.paypal, RECONCILER_INTERVAL_SECONDS)
    )
    logger.info("PayOnPass started: MongoDB+Reconciler ready")
    yield
    app.state.reconciler_task.cancel()
    try:
        await app.state.reconciler_task
    except asyncio.CancelledError:
        pass
    await close_db()


app = FastAPI(
    title="PayOnPass API",
    description="Verify-before-release payments gateway (hackathon). Sandbox/PayPal only.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ledger.router, tags=["ledger"])
app.include_router(jobs.router, tags=["jobs"])
app.include_router(review.router, tags=["review"])
app.include_router(webhook_route.router, tags=["webhooks"])
app.include_router(agents.router, tags=["agent"])
app.include_router(scorecard.router, tags=["verifier"])
app.include_router(demo.router, tags=["demo"])

# Product dashboard (built from dashboard/). Served same-origin at /app so the UI
# and API share an origin in production; in dev the dashboard runs on Vite + CORS.
_UI_DIR = Path(__file__).resolve().parents[1] / "dashboard" / "dist"
if _UI_DIR.exists():
    app.mount("/app", StaticFiles(directory=str(_UI_DIR), html=True), name="dashboard")


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": "VALIDATION_ERROR", "errors": exc.errors()})


@app.get("/")
async def root():
    return {
        "service": "PayOnPass",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
        "verification": "/verify-chain",
    }


@app.get("/health")
async def health(request: Request):
    import time

    started = time.perf_counter()
    try:
        await request.app.state.repos.jobs.coll.database.command({"ping": 1})
        db_ok = True
    except Exception as e:
        db_ok = False
        logger.warning("health: Mongo ping failed: %r", e)
    latency_ms = round((time.perf_counter() - started) * 1000, 1)
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "mongo" if db_ok else f"mongo_error",
        "latency_ms": latency_ms,
        "reconciler": "running" if getattr(request.app.state, "reconciler_task", None) else "stopped",
    }


def main():
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)


if __name__ == "__main__":
    main()