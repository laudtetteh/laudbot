"""SQLAlchemy ORM models.

Four tables:
- ``invitations``   — invite tokens and visitor config (replaces app.state.invite_tokens)
- ``mode_config``   — per-mode enabled flag, overlay, and prompts (replaces app.state.modes_*)
- ``chat_messages`` — persisted chat history keyed to visitor_id
- ``system_config`` — key/value store for admin-editable runtime config (e.g. system prompt)
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Invitation(Base):
    """One row per generated invite link."""

    __tablename__ = "invitations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    invite_token: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), unique=True, nullable=False, default=uuid.uuid4
    )
    allowed_modes: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, default=list
    )
    default_mode: Mapped[str] = mapped_column(String(50), nullable=False)
    can_switch_modes: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    # Set when the visitor accepts the invite.
    accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    visitor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    # Set by the admin to block further use of this token.
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class ModeConfig(Base):
    """One row per conversation mode — seeded at startup, editable at runtime."""

    __tablename__ = "mode_config"

    mode: Mapped[str] = mapped_column(String(50), primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    overlay: Mapped[str] = mapped_column(Text, nullable=False, default="")
    prompts: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, default=list
    )


class ChatMessage(Base):
    """One row per message turn (user or assistant) in a visitor session."""

    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Stable identifier from the visitor JWT — groups all messages per visitor.
    visitor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    mode: Mapped[str] = mapped_column(String(50), nullable=False)
    # "user" or "assistant"
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # Populated on assistant turns only.
    provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )


class SystemConfig(Base):
    """Key/value store for admin-editable runtime configuration.

    Currently used for a single row: key='system_prompt'.
    Persists across restarts (unlike app.state). Loaded into app.state at
    startup and updated in-memory on admin save — no per-request DB query.
    """

    __tablename__ = "system_config"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
