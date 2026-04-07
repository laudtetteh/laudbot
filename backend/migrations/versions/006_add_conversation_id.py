"""Add conversation_id to chat_messages.

Groups message turns into discrete conversations. Existing rows are
consolidated per visitor_id — each visitor's history becomes a single
legacy conversation UUID so nothing is lost or orphaned.

New rows must always supply conversation_id (no server-side default).
The frontend generates a UUID on page load or on New Chat / mode switch.

Revision ID: 006
Revises: 005
Create Date: 2026-04-07
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import text


revision: str = "006"
down_revision: str = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add conversation_id column; backfill existing rows per visitor."""
    # Add as nullable first so we can backfill before enforcing NOT NULL.
    op.add_column(
        "chat_messages",
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=True),
    )

    conn = op.get_bind()

    # Group each visitor's existing messages into a single legacy UUID.
    # The subquery produces one gen_random_uuid() per distinct visitor_id row,
    # then the outer UPDATE applies that UUID to all matching messages.
    conn.execute(text("""
        UPDATE chat_messages cm
        SET conversation_id = sub.cid
        FROM (
            SELECT visitor_id, gen_random_uuid() AS cid
            FROM (SELECT DISTINCT visitor_id FROM chat_messages) v
        ) sub
        WHERE cm.visitor_id = sub.visitor_id
    """))

    # Enforce NOT NULL now that all rows are populated.
    op.alter_column("chat_messages", "conversation_id", nullable=False)

    # Index for fast history lookups by conversation.
    op.create_index(
        "ix_chat_messages_conversation_id",
        "chat_messages",
        ["conversation_id"],
    )


def downgrade() -> None:
    """Remove conversation_id column and its index."""
    op.drop_index("ix_chat_messages_conversation_id", table_name="chat_messages")
    op.drop_column("chat_messages", "conversation_id")
