"""The four list builders. docs/core-contract.md says what each one must do.

A builder returns its articles as a generator and fills in its report while the generator runs:
the build job reads the report only after it has written every article.
"""

import re
from collections import deque
from collections.abc import Iterator, Mapping, Sequence
from itertools import islice
from typing import Any

from app.contract import Builder, BuildResult, Limits, Page, WikiSource
from app.core.lookup import lookup
from app.core.titles import chunked, normalize_title

NS_MAIN = 0
# Titles are looked up in groups this size; the source splits each group into API requests.
LOOKUP_GROUP = 500
# Report lists show the first entries only; the matching *_total says how many there were.
REPORT_SAMPLE = 100
CATEGORY_PREFIX = re.compile(r"^category:", re.IGNORECASE)
WIKIDATA_ITEM = re.compile(r"^https?://www\.wikidata\.org/entity/(Q[1-9][0-9]*)$")


def _note(report: dict[str, Any], key: str, value: str) -> None:
    sample: list[str] = report.setdefault(key, [])
    total = report.get(f"{key}_total", len(sample)) + 1
    if len(sample) < REPORT_SAMPLE:
        sample.append(value)
    if total > len(sample):
        report[f"{key}_total"] = total


def _int(params: Mapping[str, object], key: str, default: int | None = None) -> int:
    value = params.get(key, default)
    if not isinstance(value, int):
        raise TypeError(f"{key} must be an integer")
    return value


def _strings(params: Mapping[str, object], key: str) -> list[str]:
    value = params.get(key)
    if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
        raise TypeError(f"{key} must be a list of strings")
    return value


def _case_sensitive(source: WikiSource) -> bool:
    # Wiktionary keeps the case of the first letter: "apple" and "Apple" are different entries.
    return source.wiki.endswith(".wiktionary.org")


def _articles_for_titles(
    source: WikiSource, titles: Sequence[str], report: dict[str, Any], limits: Limits
) -> Iterator[Page]:
    """Look titles up and yield each main-namespace page once, in the order asked for."""
    seen: set[int] = set()
    for group in chunked(titles, LOOKUP_GROUP):
        found = lookup(source, group)
        for title in found.missing:
            _note(report, "missing", title)
        for title in found.invalid:
            _note(report, "invalid", title)
        for title in found.special:
            _note(report, "not_articles", title)
        for title in group:
            page = found.pages.get(title)
            if page is None:
                continue
            if page.namespace != NS_MAIN:
                _note(report, "not_articles", page.title)
                continue
            if title in found.redirected:
                report["redirected"] = report.get("redirected", 0) + 1
            if page.page_id in seen:
                continue
            seen.add(page.page_id)
            report["found"] = len(seen)
            yield page
            # One past the limit is enough for the job to fail the build with its message.
            if len(seen) > limits.max_articles:
                return


def pasted(source: WikiSource, params: Mapping[str, object], limits: Limits) -> BuildResult:
    raw = _strings(params, "titles")
    case_sensitive = _case_sensitive(source)
    report: dict[str, Any] = {"input": len(raw), "found": 0, "redirected": 0}
    titles: list[str] = []
    seen: set[str] = set()
    for item in raw:
        title = normalize_title(item, case_sensitive=case_sensitive)
        if not title:
            _note(report, "invalid", item)
        elif title not in seen:
            seen.add(title)
            titles.append(title)
    report["duplicates"] = len(raw) - len(titles) - len(report.get("invalid", []))
    return BuildResult(_articles_for_titles(source, titles, report, limits), report)


def category(source: WikiSource, params: Mapping[str, object], limits: Limits) -> BuildResult:
    case_sensitive = _case_sensitive(source)
    root = CATEGORY_PREFIX.sub(
        "", normalize_title(str(params["category"]), case_sensitive=case_sensitive)
    )
    max_depth = min(_int(params, "depth", 0), limits.max_category_depth)
    report: dict[str, Any] = {
        "categories_visited": 0,
        "depth_reached": 0,
        "loops_skipped": 0,
        "found": 0,
    }
    root = normalize_title(root, case_sensitive=case_sensitive)
    return BuildResult(_walk(source, root, max_depth, report, limits), report)


def _walk(
    source: WikiSource, root: str, max_depth: int, report: dict[str, Any], limits: Limits
) -> Iterator[Page]:
    visited = {root}
    queue: deque[tuple[str, int]] = deque([(root, 0)])
    titles: list[str] = []
    seen: set[int] = set()
    while queue and len(seen) <= limits.max_articles:
        name, level = queue.popleft()
        report["categories_visited"] += 1
        report["depth_reached"] = max(report["depth_reached"], level)
        for member in source.category_members(name, "page"):
            if member.page_id not in seen:
                seen.add(member.page_id)
                titles.append(member.title)
        if level == max_depth:
            continue
        for sub in source.category_members(name, "subcat"):
            # Subcategory titles carry the wiki's own namespace name ("Kategorie:" on dewiki);
            # the source adds the canonical "Category:", which every wiki accepts.
            bare = sub.title.partition(":")[2]
            if bare in visited:
                report["loops_skipped"] += 1
                continue
            visited.add(bare)
            queue.append((bare, level + 1))
    # Category members come without revision IDs. Looking them up pins each article to the
    # revision it had at build time, which exports rely on.
    yield from _articles_for_titles(source, titles, report, limits)


def wikidata(source: WikiSource, params: Mapping[str, object], limits: Limits) -> BuildResult:
    rows = source.sparql_rows(str(params["sparql"]))
    items: list[str] = []
    seen: set[str] = set()
    for row in rows:
        item = _item_id(row)
        if item is not None and item not in seen:
            seen.add(item)
            items.append(item)
    links = source.sitelinks(items)
    report: dict[str, Any] = {
        "rows": len(rows),
        "items": len(items),
        "with_article": len(links),
        "without_article": len(items) - len(links),
        "found": 0,
    }
    for item in items:
        if item not in links:
            _note(report, "items_without_article", item)
    titles = [links[item] for item in items if item in links]
    return BuildResult(_articles_for_titles(source, titles, report, limits), report)


def _item_id(row: Mapping[str, str]) -> str | None:
    """The item a result row is about: the ?item variable if the query has one, otherwise the
    first variable that holds a Wikidata entity."""
    preferred = [row["item"]] if "item" in row else []
    for value in [*preferred, *row.values()]:
        match = WIKIDATA_ITEM.match(value)
        if match:
            return match.group(1)
    return None


def pageviews(source: WikiSource, params: Mapping[str, object], limits: Limits) -> BuildResult:
    year, month, limit = _int(params, "year"), _int(params, "month"), _int(params, "limit")
    report: dict[str, Any] = {"month": f"{year}-{month:02d}", "found": 0}
    main_page = source.main_page()
    titles: list[str] = []
    for article in source.top_pageviews(year, month):
        if article.title == main_page:
            _note(report, "skipped", article.title)
        else:
            titles.append(article.title)
    # The ranking includes non-articles (Special:Search, project pages); those are dropped while
    # looking titles up, so take articles until there are `limit` of them.
    articles = _articles_for_titles(source, titles, report, limits)
    return BuildResult(islice(articles, min(limit, limits.max_articles)), report)


REGISTRY: dict[str, Builder] = {
    "pasted": pasted,
    "category": category,
    "wikidata": wikidata,
    "pageviews": pageviews,
}
