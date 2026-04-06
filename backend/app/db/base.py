"""SQLAlchemy async engine, session factory, and declarative base.

All ORM models import ``Base`` from here. Routes use ``get_db`` from
``app.core.dependencies`` — never import ``AsyncSessionLocal`` directly
in business logic.
"""
from __future__ import annotations

import os
import ssl

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

_raw_url = os.environ.get("DATABASE_URL", "")

# SQLAlchemy async driver requires the postgresql+asyncpg:// scheme.
# Accept plain postgresql:// from .env and upgrade it transparently.
_async_url = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# asyncpg does not parse sslmode= from the URL — strip it and pass an SSL
# context as a connect_arg instead. DO managed Postgres uses a private CA
# not in the system trust store, so ssl=True (which verifies the chain)
# would raise SSLCertVerificationError. We encrypt the connection but skip
# chain verification, which is the standard approach for managed cloud DBs.
_use_ssl = "sslmode=require" in _async_url
_async_url = _async_url.replace("?sslmode=require", "").replace("&sslmode=require", "")

ASYNC_DATABASE_URL = _async_url

if _use_ssl:
    _ssl_ctx = ssl.create_default_context()
    _ssl_ctx.check_hostname = False
    _ssl_ctx.verify_mode = ssl.CERT_NONE
    _connect_args: dict = {"ssl": _ssl_ctx}
else:
    _connect_args = {}

engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
