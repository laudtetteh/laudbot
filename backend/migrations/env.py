"""Alembic environment — async SQLAlchemy with asyncpg."""
from __future__ import annotations

import asyncio
import os
import ssl
import sys
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context

# Make app package importable from the migrations directory.
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Import all models so Alembic can detect them for autogenerate.
from app.db.models import Base  # noqa: E402  (import after sys.path mutation)

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _get_url() -> tuple[str, dict]:
    """Read DATABASE_URL from env, convert scheme, and strip sslmode.

    asyncpg does not accept sslmode= in the URL — it must be passed as a
    connect_arg instead. Returns the cleaned URL and any extra connect_args.
    """
    raw = os.environ["DATABASE_URL"]
    url = raw.replace("postgresql://", "postgresql+asyncpg://", 1)
    connect_args: dict = {}
    if "sslmode=require" in url:
        url = url.replace("?sslmode=require", "").replace("&sslmode=require", "")
        # DO managed Postgres uses a private CA not in the system trust store.
        # ssl=True would fail cert verification; use an explicit context instead.
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ctx
    return url, connect_args


def run_migrations_offline() -> None:
    """Run migrations against a URL string (no live connection needed)."""
    url, _ = _get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def _do_run_migrations(connection):
    """Inner sync callback executed inside an async connection."""
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations against a live async connection."""
    url, connect_args = _get_url()
    connectable = create_async_engine(
        url, poolclass=pool.NullPool, connect_args=connect_args
    )
    async with connectable.connect() as connection:
        await connection.run_sync(_do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
