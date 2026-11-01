"""list export

Revision ID: 8d2f4b6a1c90
Revises: 3c1e9a7d5b42
Create Date: 2026-11-01 18:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "8d2f4b6a1c90"
down_revision: str | None = "3c1e9a7d5b42"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "list_export",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("version_id", sa.BigInteger(), nullable=False),
        sa.Column("format", sa.String(length=16), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "queued", "building", "ready", "failed", name="exportstatus", native_enum=False
            ),
            nullable=False,
        ),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("progress", sa.Integer(), nullable=False),
        sa.Column("missing", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["version_id"], ["list_version.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_list_export_version_id_id", "list_export", ["version_id", "id"])
    op.create_index("ix_list_export_expires_at", "list_export", ["expires_at"])


def downgrade() -> None:
    op.drop_table("list_export")
