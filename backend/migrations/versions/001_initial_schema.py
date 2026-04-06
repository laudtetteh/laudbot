"""Initial schema — invitations, mode_config, chat_messages.

Revision ID: 001
Revises:
Create Date: 2026-04-05
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension — no-op if already present.
    # Not used yet but required for the RAG pipeline in a future PR.
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # ------------------------------------------------------------------
    # invitations — one row per generated invite link
    # ------------------------------------------------------------------
    op.create_table(
        "invitations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column("invite_token", postgresql.UUID(as_uuid=True), unique=True, nullable=False),
        sa.Column("allowed_modes", postgresql.ARRAY(sa.String), nullable=False),
        sa.Column("default_mode", sa.String(50), nullable=False),
        sa.Column("can_switch_modes", sa.Boolean, nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recruiter_id", postgresql.UUID(as_uuid=True), nullable=True),
    )

    # ------------------------------------------------------------------
    # mode_config — one row per conversation mode
    # ------------------------------------------------------------------
    op.create_table(
        "mode_config",
        sa.Column("mode", sa.String(50), primary_key=True),
        sa.Column("enabled", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("overlay", sa.Text, nullable=False, server_default=""),
        sa.Column("prompts", postgresql.ARRAY(sa.String), nullable=False, server_default="{}"),
    )

    # ------------------------------------------------------------------
    # chat_messages — one row per message turn
    # ------------------------------------------------------------------
    op.create_table(
        "chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("recruiter_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("mode", sa.String(50), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("provider", sa.String(50), nullable=True),
        sa.Column("model", sa.String(100), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    op.create_index("ix_chat_messages_recruiter_id", "chat_messages", ["recruiter_id"])


def downgrade() -> None:
    op.drop_index("ix_chat_messages_recruiter_id", "chat_messages")
    op.drop_table("chat_messages")
    op.drop_table("mode_config")
    op.drop_table("invitations")
    op.execute("DROP EXTENSION IF EXISTS vector")
