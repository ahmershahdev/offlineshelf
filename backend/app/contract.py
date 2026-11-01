"""Types shared by app/core (maintainer-written list logic) and the code that runs it.

Standard library only, so app/core can import it and stay free of Flask, database and network
code. docs/core-contract.md describes what each builder must do with these.
"""

from collections.abc import Callable, Iterable, Iterator, Mapping, Sequence
from dataclasses import dataclass, field
from typing import Literal, Protocol


@dataclass(frozen=True, slots=True)
class Page:
    page_id: int
    title: str
    namespace: int
    revision_id: int | None = None


@dataclass(frozen=True, slots=True)
class TitleBatch:
    """One api.php answer for up to 50 titles, as MediaWiki reported it."""

    normalized: Sequence[tuple[str, str]]
    redirects: Sequence[tuple[str, str]]
    pages: Sequence[Page]
    missing: Sequence[str]
    invalid: Sequence[str]
    # Titles that exist without a local page (Special: pages, Commons files), so no page ID.
    special: Sequence[str] = ()


@dataclass(frozen=True, slots=True)
class TopArticle:
    title: str
    views: int
    rank: int


class WikiSource(Protocol):
    """What a builder may ask of Wikimedia. Implemented by app.wiki.source.HttpWikiSource;
    tests pass a fake."""

    wiki: str

    def query_pages(self, titles: Sequence[str]) -> Iterator[TitleBatch]: ...

    def category_members(
        self, category: str, member_type: Literal["page", "subcat"]
    ) -> Iterator[Page]: ...

    def sparql_rows(self, query: str) -> list[dict[str, str]]: ...

    def sitelinks(self, item_ids: Sequence[str]) -> dict[str, str]: ...

    def top_pageviews(self, year: int, month: int) -> list[TopArticle]: ...

    def main_page(self) -> str: ...


@dataclass(frozen=True, slots=True)
class Limits:
    max_articles: int
    max_category_depth: int


@dataclass(slots=True)
class BuildResult:
    articles: Iterable[Page]
    report: dict[str, object] = field(default_factory=dict)


Builder = Callable[[WikiSource, Mapping[str, object], Limits], BuildResult]


Operation = Literal["union", "intersection", "difference"]

# Each source yields its pages sorted by page_id, ascending, without duplicates.
Combiner = Callable[[Operation, Sequence[Iterator[Page]], Limits], BuildResult]
