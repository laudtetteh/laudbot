"""SQLAlchemy async engine, session factory, and declarative base.

All ORM models import ``Base`` from here. Routes use ``get_db`` from
``app.core.dependencies`` — never import ``AsyncSessionLocal`` directly
in business logic.
"""
from __future__ import annotations

import os

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

_raw_url = os.environ.get("DATABASE_URL", "")

# SQLAlchemy async driver requires the postgresql+asyncpg:// scheme.
# Accept plain postgresql:// from .env and upgrade it transparently.
_async_url = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# asyncpg does not parse sslmode= from the URL — strip it and pass ssl=True
# as a connect_arg instead. DO managed Postgres always requires SSL.
_use_ssl = "sslmode=require" in _async_url
_async_url = _async_url.replace("?sslmode=require", "").replace("&sslmode=require", "")

ASYNC_DATABASE_URL = _async_url

engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    connect_args={"ssl": True} if _use_ssl else {},
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
