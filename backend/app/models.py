import enum
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

# Titles are compared byte for byte: MediaWiki treats "Apple" and "apple" as different pages
# (except for the first letter on most wikis, which core normalises before storing).
TITLE_COLLATION = "utf8mb4_bin"


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class BuilderKind(enum.StrEnum):
    CATEGORY = "category"
    WIKIDATA = "wikidata"
    PASTED = "pasted"
    PAGEVIEWS = "pageviews"


class Schedule(enum.StrEnum):
    NONE = "none"
    MONTHLY = "monthly"


class VersionStatus(enum.StrEnum):
    QUEUED = "queued"
    BUILDING = "building"
    READY = "ready"
    FAILED = "failed"


class ExportStatus(enum.StrEnum):
    QUEUED = "queued"
    BUILDING = "building"
    READY = "ready"
    FAILED = "failed"


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    # Bumped on logout-everywhere and password change; sessions carrying an older value are dead.
    session_epoch: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    lists: Mapped[list["ShelfList"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan", passive_deletes=True
    )


class ShelfList(Base):
    __tablename__ = "shelf_list"
    __table_args__ = (Index("ix_shelf_list_owner_id_id", "owner_id", "id"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(120))
    wiki: Mapped[str] = mapped_column(String(64))
    builder: Mapped[BuilderKind] = mapped_column(
        Enum(BuilderKind, values_callable=lambda e: [m.value for m in e], native_enum=False)
    )
    params: Mapped[dict[str, Any]] = mapped_column(JSON)
    schedule: Mapped[Schedule] = mapped_column(
        Enum(Schedule, values_callable=lambda e: [m.value for m in e], native_enum=False),
        default=Schedule.NONE,
    )
    # Optimistic locking: concurrent edits of the same list fail instead of overwriting each other.
    row_version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    owner: Mapped[User] = relationship(back_populates="lists")
    versions: Mapped[list["ListVersion"]] = relationship(
        back_populates="shelf_list", cascade="all, delete-orphan", passive_deletes=True
    )

    __mapper_args__ = {"version_id_col": row_version}  # noqa: RUF012


class ListVersion(Base):
    __tablename__ = "list_version"
    __table_args__ = (Index("ix_list_version_list_id_id", "list_id", "id"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    list_id: Mapped[int] = mapped_column(ForeignKey("shelf_list.id", ondelete="CASCADE"))
    status: Mapped[VersionStatus] = mapped_column(
        Enum(VersionStatus, values_callable=lambda e: [m.value for m in e], native_enum=False),
        default=VersionStatus.QUEUED,
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)
    article_count: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text)
    report: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    notified_at: Mapped[datetime | None] = mapped_column(DateTime)

    shelf_list: Mapped[ShelfList] = relationship(back_populates="versions")


class ListArticle(Base):
    __tablename__ = "list_article"
    __table_args__ = (UniqueConstraint("version_id", "page_id", name="uq_list_article_page"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    version_id: Mapped[int] = mapped_column(ForeignKey("list_version.id", ondelete="CASCADE"))
    page_id: Mapped[int] = mapped_column(BigInteger)
    title: Mapped[str] = mapped_column(String(255, collation=TITLE_COLLATION))
    revision_id: Mapped[int | None] = mapped_column(BigInteger)


class ListExport(Base):
    __tablename__ = "list_export"
    __table_args__ = (Index("ix_list_export_version_id_id", "version_id", "id"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    version_id: Mapped[int] = mapped_column(ForeignKey("list_version.id", ondelete="CASCADE"))
    format: Mapped[str] = mapped_column(String(16))
    status: Mapped[ExportStatus] = mapped_column(
        Enum(ExportStatus, values_callable=lambda e: [m.value for m in e], native_enum=False),
        default=ExportStatus.QUEUED,
    )
    file_name: Mapped[str | None] = mapped_column(String(255))
    size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    missing: Mapped[list[str] | None] = mapped_column(JSON)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, index=True)

    version: Mapped[ListVersion] = relationship()
