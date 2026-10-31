"""build report

Revision ID: 7f9fad1c53cf
Revises: 512c42b8a106
Create Date: 2026-11-01 00:55:34.683593
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "7f9fad1c53cf"
down_revision: str | None = "512c42b8a106"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("list_version", sa.Column("report", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("list_version", "report")
