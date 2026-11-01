"""Re-records the Wikimedia responses that tests/wiki replays. Run by hand, never in CI:

    uv run python -m scripts.record_wiki

It makes about ten polite requests with the project User-Agent.
"""

import contextlib
import json
from typing import Any

import httpx

from app.wiki.client import WikiApiError, WikiClient
from app.wiki.source import HttpWikiSource
from tests.wiki.recorded import RECORDINGS, request_key

KEEP_HEADERS = {"content-type", "retry-after"}
TOP_ARTICLES_KEPT = 8
# A fixed revision keeps the recording stable when the article is edited.
PAGE_HTML_REVISION = 1375425456


def record(name: str, run: Any) -> None:
    exchanges: list[dict[str, Any]] = []

    def on_response(response: httpx.Response) -> None:
        response.read()
        recorded: dict[str, Any] = {
            "status": response.status_code,
            "headers": {k: v for k, v in response.headers.items() if k in KEEP_HEADERS},
        }
        if "html" in response.headers.get("content-type", ""):
            recorded["text"] = response.text
        else:
            body = response.json()
            if "items" in body:
                body["items"][0]["articles"] = body["items"][0]["articles"][:TOP_ARTICLES_KEPT]
            recorded["body"] = body
        exchanges.append({"request": request_key(response.request), "response": recorded})

    http = httpx.Client(timeout=60, event_hooks={"response": [on_response]})
    run(WikiClient(http))
    (RECORDINGS / f"{name}.json").write_text(
        json.dumps(exchanges, indent=1, ensure_ascii=False) + "\n", "utf-8"
    )
    print(f"{name}: {len(exchanges)} exchanges")


def main() -> None:
    RECORDINGS.mkdir(parents=True, exist_ok=True)
    en = "en.wikipedia.org"
    record(
        "query_pages",
        lambda c: list(
            HttpWikiSource(c, en).query_pages(
                ["Physics", "albert einstein", "UK", "OfflineShelf no such page 7731", "Talk:"]
            )
        ),
    )

    def categories(c: WikiClient) -> None:
        source = HttpWikiSource(c, en)
        list(source.category_members("Category:Vaccines", "subcat"))
        params: dict[str, str | int] = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": "Category:Polio vaccines",
            "cmtype": "page",
            "cmnamespace": 0,
            "cmprop": "ids|title",
            "cmlimit": 3,
        }
        for i, _ in enumerate(c.action_continue(en, params)):
            if i == 1:
                break

    record("category_members", categories)
    record(
        "sitelinks",
        lambda c: HttpWikiSource(c, "ur.wikipedia.org").sitelinks(["Q42", "Q937", "Q4115189"]),
    )
    record(
        "sparql",
        lambda c: HttpWikiSource(c, en).sparql_rows(
            "SELECT ?item WHERE { ?item wdt:P31 wd:Q3918 ; wdt:P17 wd:Q843 . } LIMIT 5"
        ),
    )
    record("top_pageviews", lambda c: HttpWikiSource(c, en).top_pageviews(2026, 8))

    def page_html(c: WikiClient) -> None:
        c.page_html(en, "Kiwix", PAGE_HTML_REVISION)
        with contextlib.suppress(WikiApiError):
            c.page_html(en, "OfflineShelf no such page 7731", None)

    record("page_html", page_html)


if __name__ == "__main__":
    main()
