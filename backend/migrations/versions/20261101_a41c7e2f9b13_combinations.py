"""combinations

Revision ID: a41c7e2f9b13
Revises: 8d2f4b6a1c90
Create Date: 2026-11-01 19:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a41c7e2f9b13"
down_revision: str | None = "8d2f4b6a1c90"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # The non-native enum is a VARCHAR sized to its longest value; "combination" needs more.
    op.alter_column(
        "shelf_list",
        "builder",
        existing_type=sa.String(length=9),
        type_=sa.String(length=16),
        existing_nullable=False,
    )
    op.create_table(
        "combination_source",
        sa.Column("combination_id", sa.BigInteger(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("source_list_id", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(["combination_id"], ["shelf_list.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_list_id"], ["shelf_list.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("combination_id", "position"),
    )
    op.create_index(
        "ix_combination_source_source_list_id", "combination_source", ["source_list_id"]
    )


def downgrade() -> None:
    op.drop_table("combination_source")
    op.execute(sa.text("DELETE FROM shelf_list WHERE builder = 'combination'"))
    op.alter_column(
        "shelf_list",
        "builder",
        existing_type=sa.String(length=16),
        type_=sa.String(length=9),
        existing_nullable=False,
    )
