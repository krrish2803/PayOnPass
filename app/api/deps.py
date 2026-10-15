"""FastAPI dependency providers. All singletons live on app.state so tests can
override them cheaply."""

from __future__ import annotations

from fastapi import Request

from app.llm.provider import LLMClient
from app.paypal.client import PayPalClient
from app.repositories import Repos


def get_repos(request: Request) -> Repos:
    return request.app.state.repos


def get_paypal(request: Request) -> PayPalClient:
    return request.app.state.paypal


def get_llm(request: Request) -> LLMClient:
    return request.app.state.llm