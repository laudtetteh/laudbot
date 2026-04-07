"""Rename mode slugs — recruiter → professional, coworker → peer.

Updates existing rows in ``mode_config`` and ``chat_messages`` to use the
new slugs. Existing admin-saved overlay text, prompts, and enabled state are
preserved — only the slug (primary key in mode_config) changes.

Revision ID: 004
Revises: 003
Create Date: 2026-04-06
"""
from __future__ import annotations

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = "004"
down_revision: str = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Rename recruiter → professional and coworker → peer in data rows."""
    conn = op.get_bind()

    # mode_config: mode is the primary key, so update the PK value directly.
    # No foreign key constraints reference this column in other tables.
    conn.execute(text("UPDATE mode_config SET mode = 'professional' WHERE mode = 'recruiter'"))
    conn.execute(text("UPDATE mode_config SET mode = 'peer' WHERE mode = 'coworker'"))

    # chat_messages: mode column stores the slug per message row.
    conn.execute(text("UPDATE chat_messages SET mode = 'professional' WHERE mode = 'recruiter'"))
    conn.execute(text("UPDATE chat_messages SET mode = 'peer' WHERE mode = 'coworker'"))

    # invitations: default_mode and allowed_modes columns store slug values.
    # default_mode is a plain text column.
    conn.execute(text("UPDATE invitations SET default_mode = 'professional' WHERE default_mode = 'recruiter'"))
    conn.execute(text("UPDATE invitations SET default_mode = 'peer' WHERE default_mode = 'coworker'"))

    # allowed_modes is a JSON array — replace slug within the array.
    conn.execute(text(
        "UPDATE invitations SET allowed_modes = "
        "array_replace(array_replace(allowed_modes, 'recruiter', 'professional'), 'coworker', 'peer')"
    ))


def downgrade() -> None:
    """Revert professional → recruiter and peer → coworker in data rows."""
    conn = op.get_bind()

    conn.execute(text("UPDATE mode_config SET mode = 'recruiter' WHERE mode = 'professional'"))
    conn.execute(text("UPDATE mode_config SET mode = 'coworker' WHERE mode = 'peer'"))

    conn.execute(text("UPDATE chat_messages SET mode = 'recruiter' WHERE mode = 'professional'"))
    conn.execute(text("UPDATE chat_messages SET mode = 'coworker' WHERE mode = 'peer'"))

    conn.execute(text("UPDATE invitations SET default_mode = 'recruiter' WHERE default_mode = 'professional'"))
    conn.execute(text("UPDATE invitations SET default_mode = 'coworker' WHERE default_mode = 'peer'"))

    conn.execute(text(
        "UPDATE invitations SET allowed_modes = "
        "array_replace(array_replace(allowed_modes, 'professional', 'recruiter'), 'peer', 'coworker')"
    ))
