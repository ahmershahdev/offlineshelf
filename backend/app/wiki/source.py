from collections.abc import Iterator, Sequence
from functools import cached_property
from typing import Any, Literal

from app.contract import Page, TitleBatch, TopArticle
from app.wiki.client import WIKIDATA_HOST, WikiApiError, WikiClient

# api.php accepts at most 50 titles or IDs per request for normal accounts.
# https://www.mediawiki.org/wiki/API:Query#Specifying_pages
TITLES_PER_REQUEST = 50
NS_MAIN = 0
NS_CATEGORY = 14


class HttpWikiSource:
    def __init__(self, client: WikiClient, wiki: str, sparql_timeout: float = 60.0) -> None:
        self.client = client
        self.wiki = wiki
        self.sparql_timeout = sparql_timeout

    def query_pages(self, titles: Sequence[str]) -> Iterator[TitleBatch]:
        for start in range(0, len(titles), TITLES_PER_REQUEST):
            chunk = titles[start : start + TITLES_PER_REQUEST]
            data = self.client.action(
                self.wiki,
                {"action": "query", "titles": "|".join(chunk), "redirects": 1, "prop": "info"},
            )
            yield _title_batch(data.get("query", {}))

    def category_members(
        self, category: str, member_type: Literal["page", "subcat"]
    ) -> Iterator[Page]:
        params: dict[str, str | int] = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": category if category.startswith("Category:") else f"Category:{category}",
            "cmtype": member_type,
            "cmnamespace": NS_MAIN if member_type == "page" else NS_CATEGORY,
            "cmprop": "ids|title",
            "cmlimit": "max",
        }
        for data in self.client.action_continue(self.wiki, params):
            for m in data.get("query", {}).get("categorymembers", []):
                yield Page(page_id=m["pageid"], title=m["title"], namespace=m["ns"])

    def sparql_rows(self, query: str) -> list[dict[str, str]]:
        data = self.client.sparql(query, timeout=self.sparql_timeout)
        return [
            {name: cell["value"] for name, cell in binding.items()}
            for binding in data.get("results", {}).get("bindings", [])
        ]

    def sitelinks(self, item_ids: Sequence[str]) -> dict[str, str]:
        titles: dict[str, str] = {}
        for start in range(0, len(item_ids), TITLES_PER_REQUEST):
            data = self.client.action(
                WIKIDATA_HOST,
                {
                    "action": "wbgetentities",
                    "ids": "|".join(item_ids[start : start + TITLES_PER_REQUEST]),
                    "props": "sitelinks",
                    "sitefilter": self.site_id,
                },
            )
            for item_id, entity in data.get("entities", {}).items():
                link = entity.get("sitelinks", {}).get(self.site_id)
                if link:
                    titles[item_id] = link["title"]
        return titles

    def top_pageviews(self, year: int, month: int) -> list[TopArticle]:
        # The pageviews API names projects without ".org" and answers 404 for the full host.
        project = self.wiki.removesuffix(".org")
        data = self.client.rest(
            f"/metrics/pageviews/top/{project}/all-access/{year}/{month:02d}/all-days"
        )
        items = data.get("items") or [{}]
        return [
            TopArticle(title=a["article"].replace("_", " "), views=a["views"], rank=a["rank"])
            for a in items[0].get("articles", [])
        ]

    def main_page(self) -> str:
        title = self._siteinfo.get("mainpage")
        if not isinstance(title, str):
            raise WikiApiError(f"{self.wiki} did not report its main page")
        return title

    @cached_property
    def site_id(self) -> str:
        # Wikidata sitelinks are keyed by database name, which can't be derived from the host:
        # be-tarask.wikipedia.org is "be_x_oldwiki". siteinfo says what it is.
        wiki_id = self._siteinfo.get("wikiid")
        if not isinstance(wiki_id, str):
            raise WikiApiError(f"{self.wiki} did not report its wiki ID")
        return wiki_id

    @cached_property
    def _siteinfo(self) -> dict[str, Any]:
        data = self.client.action(self.wiki, {"action": "query", "meta": "siteinfo"})
        general: dict[str, Any] = data.get("query", {}).get("general", {})
        return general


def _title_batch(query: dict[str, Any]) -> TitleBatch:
    pages: list[Page] = []
    missing: list[str] = []
    invalid: list[str] = []
    special: list[str] = []
    for p in query.get("pages", []):
        if p.get("invalid"):
            invalid.append(p["title"])
        elif p.get("special") or p.get("known"):
            # "known" marks titles that exist without a local page, such as a Commons file seen
            # from Wikipedia. Like Special: pages, they are real but not articles.
            special.append(p["title"])
        elif p.get("missing"):
            missing.append(p["title"])
        else:
            pages.append(
                Page(
                    page_id=p["pageid"],
                    title=p["title"],
                    namespace=p["ns"],
                    revision_id=p.get("lastrevid"),
                )
            )
    return TitleBatch(
        normalized=[(n["from"], n["to"]) for n in query.get("normalized", [])],
        redirects=[(r["from"], r["to"]) for r in query.get("redirects", [])],
        pages=pages,
        missing=missing,
        invalid=invalid,
        special=special,
    )
