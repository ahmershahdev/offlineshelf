"""version notified_at

Revision ID: 3c1e9a7d5b42
Revises: 7f9fad1c53cf
Create Date: 2026-11-01 12:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "3c1e9a7d5b42"
down_revision: str | None = "7f9fad1c53cf"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("list_version", sa.Column("notified_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("list_version", "notified_at")
