"""version changes

Revision ID: c7d2e8f1a6b4
Revises: a41c7e2f9b13
Create Date: 2026-11-01 21:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c7d2e8f1a6b4"
down_revision: str | None = "a41c7e2f9b13"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("list_version", sa.Column("previous_version_id", sa.BigInteger(), nullable=True))
    op.add_column("list_version", sa.Column("added_count", sa.Integer(), nullable=True))
    op.add_column("list_version", sa.Column("removed_count", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_list_version_previous",
        "list_version",
        "list_version",
        ["previous_version_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_list_version_previous", "list_version", type_="foreignkey")
    op.drop_column("list_version", "removed_count")
    op.drop_column("list_version", "added_count")
    op.drop_column("list_version", "previous_version_id")
