"""Rename recruiter_id → visitor_id in invitations and chat_messages.

The JWT role was "recruiter" — too narrow, since invited users aren't
necessarily recruiters. Renamed to "visitor" throughout. This migration
renames the two DB columns that carried the old name.

Revision ID: 003
Revises: 002
Create Date: 2026-04-06
"""
from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: str = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Rename recruiter_id → visitor_id in both tables."""
    op.alter_column("invitations", "recruiter_id", new_column_name="visitor_id")
    op.alter_column("chat_messages", "recruiter_id", new_column_name="visitor_id")


def downgrade() -> None:
    """Revert visitor_id → recruiter_id in both tables."""
    op.alter_column("invitations", "visitor_id", new_column_name="recruiter_id")
    op.alter_column("chat_messages", "visitor_id", new_column_name="recruiter_id")
