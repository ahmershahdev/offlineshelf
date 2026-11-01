from collections.abc import Iterator, Sequence
from dataclasses import dataclass, field
from typing import Literal

from app.contract import Page, TitleBatch, TopArticle

BATCH = 50


@dataclass
class FakeWiki:
    """A WikiSource with its answers written out by hand. Lookups follow MediaWiki's shape:
    normalised spellings, redirects, missing, invalid and special titles, 50 titles per batch."""

    wiki: str = "en.wikipedia.org"
    pages: dict[str, Page] = field(default_factory=dict)
    normalized: dict[str, str] = field(default_factory=dict)
    redirects: dict[str, str] = field(default_factory=dict)
    invalid: set[str] = field(default_factory=set)
    special: set[str] = field(default_factory=set)
    members: dict[str, list[Page]] = field(default_factory=dict)
    subcats: dict[str, list[Page]] = field(default_factory=dict)
    rows: list[dict[str, str]] = field(default_factory=list)
    links: dict[str, str] = field(default_factory=dict)
    top: list[TopArticle] = field(default_factory=list)
    main: str = "Main Page"
    calls: list[str] = field(default_factory=list)

    def query_pages(self, titles: Sequence[str]) -> Iterator[TitleBatch]:
        for start in range(0, len(titles), BATCH):
            chunk = titles[start : start + BATCH]
            self.calls.append(f"query_pages:{len(chunk)}")
            normalized, redirects, pages, missing, invalid, special = [], [], [], [], [], []
            for title in chunk:
                if title in self.invalid:
                    invalid.append(title)
                    continue
                spelled = self.normalized.get(title, title)
                if spelled != title:
                    normalized.append((title, spelled))
                if spelled in self.special:
                    special.append(spelled)
                    continue
                target = self.redirects.get(spelled, spelled)
                if target != spelled:
                    redirects.append((spelled, target))
                if target in self.pages:
                    pages.append(self.pages[target])
                else:
                    missing.append(target)
            yield TitleBatch(normalized, redirects, pages, missing, invalid, special)

    def category_members(
        self, category: str, member_type: Literal["page", "subcat"]
    ) -> Iterator[Page]:
        self.calls.append(f"{member_type}:{category}")
        source = self.members if member_type == "page" else self.subcats
        yield from source.get(category, [])

    def sparql_rows(self, query: str) -> list[dict[str, str]]:  # noqa: ARG002
        self.calls.append("sparql")
        return self.rows

    def sitelinks(self, item_ids: Sequence[str]) -> dict[str, str]:
        return {i: self.links[i] for i in item_ids if i in self.links}

    def top_pageviews(self, year: int, month: int) -> list[TopArticle]:
        self.calls.append(f"top:{year}-{month}")
        return self.top

    def main_page(self) -> str:
        return self.main


def page(page_id: int, title: str, namespace: int = 0, revision_id: int | None = None) -> Page:
    return Page(page_id=page_id, title=title, namespace=namespace, revision_id=revision_id)


def article(page_id: int, title: str) -> Page:
    return page(page_id, title, 0, page_id * 10)
