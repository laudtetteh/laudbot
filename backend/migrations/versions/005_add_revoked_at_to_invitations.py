"""Add revoked_at column to invitations table.

Soft-revoke support: admin can revoke an invite without deleting the row.
The accept-invite endpoint rejects tokens where revoked_at IS NOT NULL.

Revision ID: 005
Revises: 004
Create Date: 2026-04-06
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision: str = "005"
down_revision: str = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add nullable revoked_at column to invitations."""
    op.add_column(
        "invitations",
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    """Remove revoked_at column from invitations."""
    op.drop_column("invitations", "revoked_at")
