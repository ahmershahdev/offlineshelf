from datetime import UTC, date, datetime
from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    field_validator,
)

from app.config import current_settings
from app.models import BuilderKind, ExportStatus, Schedule, VersionStatus
from app.security.wiki_hosts import is_allowed_wiki

# The database stores naive UTC; without an offset in the JSON, browsers read it as local time.
UtcDateTime = Annotated[datetime, AfterValidator(lambda d: d.replace(tzinfo=UTC))]

# MediaWiki caps titles at 255 bytes of UTF-8. This only rejects input that can never be a
# title; normalising (underscores, first-letter case, namespaces) belongs to app/core.
_FORBIDDEN_TITLE_CHARS = set("#<>[]{}|")


def _check_title(value: str) -> str:
    if len(value.encode()) > 255:
        raise ValueError("title is longer than 255 bytes")
    if _FORBIDDEN_TITLE_CHARS & set(value) or any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise ValueError("title contains characters MediaWiki does not allow")
    return value


Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Credentials(Strict):
    email: EmailStr = Field(max_length=254)
    # Upper bound keeps hashing cost bounded; NIST SP 800-63B asks for at least 64 allowed.
    password: str = Field(min_length=12, max_length=256)

    @field_validator("email")
    @classmethod
    def lower_email(cls, value: str) -> str:
        return value.lower()


class UserOut(BaseModel):
    id: int
    email: str


class CategoryParams(Strict):
    kind: Literal[BuilderKind.CATEGORY] = BuilderKind.CATEGORY
    category: Title
    depth: int = Field(default=0, ge=0)

    @field_validator("category")
    @classmethod
    def valid_category(cls, value: str) -> str:
        return _check_title(value)

    @field_validator("depth")
    @classmethod
    def depth_limit(cls, value: int) -> int:
        limit = current_settings().max_category_depth
        if value > limit:
            raise ValueError(f"depth must be at most {limit}")
        return value


class WikidataParams(Strict):
    kind: Literal[BuilderKind.WIKIDATA] = BuilderKind.WIKIDATA
    sparql: str = Field(min_length=1)

    @field_validator("sparql")
    @classmethod
    def size_limit(cls, value: str) -> str:
        limit = current_settings().max_sparql_chars
        if len(value) > limit:
            raise ValueError(f"query must be at most {limit} characters")
        return value


class PastedParams(Strict):
    kind: Literal[BuilderKind.PASTED] = BuilderKind.PASTED
    titles: list[Title] = Field(min_length=1)

    @field_validator("titles")
    @classmethod
    def titles_limit(cls, value: list[str]) -> list[str]:
        limit = current_settings().max_pasted_titles
        if len(value) > limit:
            raise ValueError(f"at most {limit} titles")
        return [_check_title(t) for t in value]


class PageviewsParams(Strict):
    kind: Literal[BuilderKind.PAGEVIEWS] = BuilderKind.PAGEVIEWS
    year: int = Field(ge=2016)
    month: int = Field(ge=1, le=12)
    limit: int = Field(ge=1)

    @field_validator("limit")
    @classmethod
    def top_limit(cls, value: int) -> int:
        cap = current_settings().max_top_articles
        if value > cap:
            raise ValueError(f"limit must be at most {cap}")
        return value

    @field_validator("year")
    @classmethod
    def not_future(cls, value: int) -> int:
        # The pageviews API starts in July 2015; full months from 2016 on are always complete.
        if value > date.today().year:
            raise ValueError("year is in the future")
        return value


MAX_COMBINATION_SOURCES = 10


class CombinationParams(Strict):
    kind: Literal[BuilderKind.COMBINATION] = BuilderKind.COMBINATION
    operation: Literal["union", "intersection", "difference"]
    sources: list[int] = Field(min_length=2, max_length=MAX_COMBINATION_SOURCES)

    @field_validator("sources")
    @classmethod
    def distinct(cls, value: list[int]) -> list[int]:
        if len(set(value)) != len(value):
            raise ValueError("each source list can appear only once")
        return value


BuilderParams = Annotated[
    CategoryParams | WikidataParams | PastedParams | PageviewsParams | CombinationParams,
    Field(discriminator="kind"),
]


class ListCreate(Strict):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
    wiki: str = Field(max_length=64)
    params: BuilderParams
    schedule: Schedule = Schedule.NONE

    @field_validator("wiki")
    @classmethod
    def allowed_wiki(cls, value: str) -> str:
        value = value.lower()
        if not is_allowed_wiki(value):
            raise ValueError("wiki must be a Wikimedia content wiki, for example en.wikipedia.org")
        return value


class ListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    wiki: str
    builder: BuilderKind
    params: dict[str, object]
    schedule: Schedule
    created_at: UtcDateTime
    latest_status: VersionStatus | None = None


class ListPage(BaseModel):
    items: list[ListOut]
    next_cursor: int | None


class VersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: VersionStatus
    started_at: UtcDateTime | None
    finished_at: UtcDateTime | None
    article_count: int
    error: str | None
    report: dict[str, object] | None
    previous_version_id: int | None
    added_count: int | None
    removed_count: int | None


class VersionPage(BaseModel):
    items: list[VersionOut]
    next_cursor: int | None


class ArticleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    page_id: int
    title: str
    revision_id: int | None


class ArticlePage(BaseModel):
    items: list[ArticleOut]
    next_cursor: int | None


class ExportCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    format: Literal["html", "zim"] = "html"


class ExportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    version_id: int
    format: str
    status: ExportStatus
    progress: int
    total: int
    size_bytes: int | None
    missing: list[str] | None
    error: str | None
    created_at: UtcDateTime
    finished_at: UtcDateTime | None
    expires_at: UtcDateTime | None


class Problem(BaseModel):
    """RFC 9457 problem details."""

    type: str = "about:blank"
    title: str
    status: int
    detail: str | None = None
    errors: list[dict[str, object]] | None = None
