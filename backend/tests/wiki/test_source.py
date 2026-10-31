import httpx
import pytest

from app.contract import Page
from app.wiki.client import WikiApiError, WikiClient
from app.wiki.source import HttpWikiSource
from tests.wiki.recorded import Replay, Script


def source(transport: httpx.MockTransport, wiki: str = "en.wikipedia.org") -> HttpWikiSource:
    return HttpWikiSource(WikiClient(httpx.Client(transport=transport), sleep=lambda _: None), wiki)


def test_query_pages_reports_normalized_redirects_missing_and_invalid() -> None:
    titles = ["Physics", "albert einstein", "UK", "OfflineShelf no such page 7731", "Talk:"]
    [batch] = source(Replay("query_pages")).query_pages(titles)

    assert ("albert einstein", "Albert einstein") in batch.normalized
    assert ("UK", "United Kingdom") in batch.redirects
    assert batch.missing == ["OfflineShelf no such page 7731"]
    assert batch.invalid == ["Talk:"]
    found = {p.title: p for p in batch.pages}
    assert set(found) == {"Physics", "Albert Einstein", "United Kingdom"}
    assert found["Physics"].page_id > 0
    assert found["Physics"].namespace == 0
    assert found["Physics"].revision_id


def test_query_pages_sends_at_most_50_titles_per_request() -> None:
    empty = httpx.Response(200, json={"query": {"pages": []}})
    transport = Script(empty, empty, empty)
    batches = list(source(transport).query_pages([f"T{i}" for i in range(120)]))
    assert len(batches) == 3
    sizes = [len(r.url.params["titles"].split("|")) for r in transport.requests]
    assert sizes == [50, 50, 20]


def test_category_subcategories() -> None:
    subcats = list(source(Replay("category_members")).category_members("Vaccines", "subcat"))
    assert subcats
    assert all(p.namespace == 14 and p.title.startswith("Category:") for p in subcats)


def test_category_members_follow_continuation() -> None:
    client = WikiClient(httpx.Client(transport=Replay("category_members")))
    params: dict[str, str | int] = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": "Category:Polio vaccines",
        "cmtype": "page",
        "cmnamespace": 0,
        "cmprop": "ids|title",
        "cmlimit": 3,
    }
    responses = client.action_continue("en.wikipedia.org", params)
    first, second = next(responses), next(responses)
    assert first["continue"]["cmcontinue"] != second["continue"]["cmcontinue"]
    titles = [m["title"] for r in (first, second) for m in r["query"]["categorymembers"]]
    assert len(titles) == len(set(titles)) == 6


def test_category_members_maps_pages() -> None:
    body = {"query": {"categorymembers": [{"pageid": 7, "ns": 0, "title": "Polio vaccine"}]}}
    pages = list(source(Script(httpx.Response(200, json=body))).category_members("X", "page"))
    assert pages == [Page(page_id=7, title="Polio vaccine", namespace=0)]


def test_sitelinks_map_items_to_titles_on_the_target_wiki() -> None:
    titles = source(Replay("sitelinks"), "ur.wikipedia.org").sitelinks(["Q42", "Q937", "Q4115189"])
    assert set(titles) <= {"Q42", "Q937"}
    assert titles["Q937"]
    assert "Q4115189" not in titles


def test_site_id_must_be_reported() -> None:
    transport = Script(httpx.Response(200, json={"query": {"general": {}}}))
    with pytest.raises(WikiApiError, match="wiki ID"):
        _ = source(transport).site_id


def test_sparql_rows_flatten_bindings() -> None:
    rows = source(Replay("sparql")).sparql_rows(
        "SELECT ?item WHERE { ?item wdt:P31 wd:Q3918 ; wdt:P17 wd:Q843 . } LIMIT 5"
    )
    assert 0 < len(rows) <= 5
    assert all(r["item"].startswith("http://www.wikidata.org/entity/Q") for r in rows)


def test_top_pageviews_uses_project_name_without_org() -> None:
    top = source(Replay("top_pageviews")).top_pageviews(2026, 8)
    assert top[0].rank == 1
    assert top[0].title == "Main Page"
    assert all("_" not in a.title for a in top)
    assert [a.rank for a in top] == sorted(a.rank for a in top)


def test_top_pageviews_with_no_items() -> None:
    assert source(Script(httpx.Response(200, json={}))).top_pageviews(2026, 8) == []
