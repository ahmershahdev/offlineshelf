# Core contract: what `app/core` must provide

`backend/app/core` is written by the maintainer (AGENTS.md). Everything around it is built and
tested: the Wikimedia client, the build job, the API and the database. This file is the
interface between the two. Change it in the same PR as the code.

## What the build job expects

A module `app/core/builders.py` with:

```python
from app.contract import Builder
from app.models import BuilderKind  # or the plain strings: "category", "wikidata", ...

REGISTRY: dict[BuilderKind, Builder]
```

`Builder` is `(source: WikiSource, params: Mapping[str, object], limits: Limits) -> BuildResult`
(all in `app/contract.py`, standard library only).

- Until `REGISTRY` has an entry for a builder, its builds fail with "The X builder is not
  implemented yet." Nothing else breaks.
- `params` is the list's stored parameters, already validated by `app/schemas.py` (types, ranges,
  allowed characters, sizes). `kind` is not included.
- `BuildResult.articles` may be a generator. The job writes it in batches of 1000 inside one
  transaction, so a list of 100,000 articles never sits in memory.
- `BuildResult.report` is stored as JSON on the version and shown to the user. Keep it small:
  counts and short lists (for example the first 100 missing titles), not every title.
- More than `limits.max_articles` articles fails the build. Stopping early yourself is better.
- Raising `WikiNetworkError` (from the source) makes the job retry up to 3 times. Any other
  exception fails the build; the last good version stays current.
- No Flask, SQLAlchemy, Redis or network imports in core. Talk to Wikimedia only through
  `WikiSource`, so tests can pass a fake.
- 100% branch coverage, tested with a fake `WikiSource` (no recordings needed in core tests).

## What `WikiSource` gives you

Implemented by `app/wiki/source.py` against the live APIs, with retries, maxlag and continuation
already handled. Every method returns what MediaWiki said, without decisions.

| Method | Returns | Notes |
|---|---|---|
| `query_pages(titles)` | `Iterator[TitleBatch]`, one per 50 titles | `normalized` and `redirects` are `(from, to)` pairs; `pages` are the final targets; `missing` and `invalid` as MediaWiki reported them |
| `category_members(category, "page")` | `Iterator[Page]` | Articles (namespace 0) directly in the category. `category` with or without `Category:` |
| `category_members(category, "subcat")` | `Iterator[Page]` | Subcategories (namespace 14), titles include `Category:` |
| `sparql_rows(query)` | `list[dict[str, str]]` | One dict per result row, variable name to value; entity values are full URIs like `http://www.wikidata.org/entity/Q42` |
| `sitelinks(item_ids)` | `dict[str, str]` | Item ID (`Q42`) to article title on the list's wiki; items without an article are absent |
| `top_pageviews(year, month)` | `list[TopArticle]` | Up to 1000, rank order, underscores already turned into spaces |

## The four builders

### Pasted titles: `{"titles": [str, ...]}`

1. Normalise each title the way MediaWiki does, so duplicates collapse before any request:
   trim, underscores to spaces, collapse repeated spaces, first letter uppercase (most wikis;
   Wiktionary is case-sensitive), strip a leading `:`.
2. Look them up with `query_pages`. Follow `normalized`, then `redirects`, to know which input
   became which page.
3. Keep only namespace 0 pages. Report missing, invalid and non-article titles separately.
4. Several inputs can land on the same page (a title and its redirect). Keep one.
5. Report suggestion: `{"input": n, "found": n, "redirected": n, "missing": [...], "invalid": [...], "not_articles": [...]}`.

### Category: `{"category": str, "depth": int}`

1. Breadth-first from the category: articles with `"page"`, subcategories with `"subcat"`.
2. `depth` 0 means only the category itself; stop descending at `depth`
   (also capped by `limits.max_category_depth`).
3. Category trees contain loops (A is in B, B is in A). Track visited categories; never visit one
   twice.
4. An article in several subcategories appears once.
5. Report suggestion: `{"categories_visited": n, "depth_reached": n, "loops_skipped": n}`.

### Wikidata: `{"sparql": str}`

1. Run `sparql_rows`. Take item IDs from entity URIs in the rows (decide which variable: the first
   one, or one named `item`, and document it in the UI).
2. Map IDs to titles with `sitelinks`. Items without an article on this wiki go in the report.
3. Look the titles up with `query_pages` to get page IDs and revision IDs.
4. Report suggestion: `{"rows": n, "items": n, "with_article": n, "without_article": n}`.

### Top by pageviews: `{"year": int, "month": int, "limit": int}`

1. `top_pageviews` returns non-articles too: the recorded August 2026 data starts with
   `Main Page`, `Special:Search` and `Wikipedia:Featured pictures`. Drop the main page and
   anything outside namespace 0 (`query_pages` tells you the namespace).
2. Take the first `limit` that remain, in rank order.
3. Report suggestion: `{"skipped": [...], "month": "2026-08"}`.

## Later milestones

- M3: version diff (articles added and removed between two versions), given two sorted
  iterators of page IDs.
- M4: union, intersection and difference of up to 10 lists, and cycle detection between lists.
