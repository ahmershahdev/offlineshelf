"""initial schema

Revision ID: 512c42b8a106
Revises:
Create Date: 2026-10-31 23:30:35.537178
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "512c42b8a106"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("session_epoch", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_table(
        "shelf_list",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("owner_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("wiki", sa.String(length=64), nullable=False),
        sa.Column(
            "builder",
            sa.Enum(
                "category", "wikidata", "pasted", "pageviews", name="builderkind", native_enum=False
            ),
            nullable=False,
        ),
        sa.Column("params", sa.JSON(), nullable=False),
        sa.Column(
            "schedule",
            sa.Enum("none", "monthly", name="schedule", native_enum=False),
            nullable=False,
        ),
        sa.Column("row_version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_shelf_list_owner_id_id", "shelf_list", ["owner_id", "id"], unique=False)
    op.create_table(
        "list_version",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("list_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "queued", "building", "ready", "failed", name="versionstatus", native_enum=False
            ),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("article_count", sa.Integer(), nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["list_id"], ["shelf_list.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_list_version_list_id_id", "list_version", ["list_id", "id"], unique=False)
    op.create_table(
        "list_article",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("version_id", sa.BigInteger(), nullable=False),
        sa.Column("page_id", sa.BigInteger(), nullable=False),
        sa.Column("title", sa.String(length=255, collation="utf8mb4_bin"), nullable=False),
        sa.Column("revision_id", sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(["version_id"], ["list_version.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("version_id", "page_id", name="uq_list_article_page"),
    )


def downgrade() -> None:
    op.drop_table("list_article")
    op.drop_table("list_version")
    op.drop_table("shelf_list")
    op.drop_table("user")
