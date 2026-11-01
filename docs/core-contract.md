# Core contract: what `app/core` must provide

`backend/app/core` holds the list logic; everything around it (the Wikimedia client, the build
job, the API and the database) calls it through this interface. Both sides are implemented and
tested. Change this file in the same PR as either side. AGENTS.md says how core was written.

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
| `main_page()` | `str` | The wiki's main page title, from siteinfo (shared with the Wikidata site ID lookup) |

`TitleBatch.special` lists titles that exist without a local page: `Special:` pages and files
that live on Commons (MediaWiki marks those `missing` and `known`). They have no page ID.

## The four builders (implemented in `app/core/builders.py`)

### Pasted titles: `{"titles": [str, ...]}`

1. Normalise each title the way MediaWiki does, so duplicates collapse before any request:
   trim, underscores to spaces, collapse repeated spaces, first letter uppercase (most wikis;
   Wiktionary is case-sensitive), strip a leading `:`.
2. Look them up with `query_pages`. Follow `normalized`, then `redirects`, to know which input
   became which page.
3. Keep only namespace 0 pages. Report missing, invalid and non-article titles separately.
4. Several inputs can land on the same page (a title and its redirect). Keep one.
5. Report: `{"input", "found", "redirected", "duplicates", "missing", "invalid", "not_articles"}`.
   Lists keep their first 100 entries; when there were more, `<name>_total` holds the count.

### Category: `{"category": str, "depth": int}`

1. Breadth-first from the category: articles with `"page"`, subcategories with `"subcat"`. The
   name is taken with or without the English `Category:` prefix. Subcategory titles come back
   with the wiki's own prefix (`Kategorie:`), so the bare name is passed on and the source adds
   the canonical `Category:`. Members come without revision IDs, so they are looked up with
   `query_pages` afterwards and every article is pinned to a revision.
2. `depth` 0 means only the category itself; stop descending at `depth`
   (also capped by `limits.max_category_depth`).
3. Category trees contain loops (A is in B, B is in A). Track visited categories; never visit one
   twice.
4. An article in several subcategories appears once.
5. Report suggestion: `{"categories_visited": n, "depth_reached": n, "loops_skipped": n}`.

### Wikidata: `{"sparql": str}`

1. Run `sparql_rows`. The item of a row is `?item` when the query selects it, otherwise the first
   variable holding a Wikidata entity URI (`Q` items only).
2. Map IDs to titles with `sitelinks`. Items without an article on this wiki go in the report.
3. Look the titles up with `query_pages` to get page IDs and revision IDs.
4. Report suggestion: `{"rows": n, "items": n, "with_article": n, "without_article": n}`.

### Top by pageviews: `{"year": int, "month": int, "limit": int}`

1. `top_pageviews` returns non-articles too: the recorded August 2026 data starts with
   `Main Page`, `Special:Search` and `Wikipedia:Featured pictures`. Drop the main page and
   anything outside namespace 0 (`query_pages` tells you the namespace).
2. Take the first `limit` that remain, in rank order.
3. Report suggestion: `{"skipped": [...], "month": "2026-08"}`.

## Combinations: `app/core/combine.py`

```python
from app.contract import Combiner

combine: Combiner
```

`Combiner` is `(operation, sources: Sequence[Iterator[Page]], limits: Limits) -> BuildResult`.

- `operation` is `"union"`, `"intersection"` or `"difference"` (the first source minus all the
  others). There are 2 to 10 sources, in the order the user chose.
- Each source yields the pages of one list's latest ready version, **sorted by `page_id`
  ascending, without duplicates**, read lazily from the database. Merging them in one pass keeps
  memory flat however large the lists are; don't turn them into lists or sets.
- A page in several sources can have different titles or revision IDs (the sources were built at
  different times). Pick one rule and document it; taking the first source's copy is simplest.
- `articles` can be a generator; more than `limits.max_articles` fails the build as for builders.
- Report suggestion: `{"operation": "union", "inputs": [n, n], "result": n}`. The job adds
  `"source_versions": [version ids]` itself.
- Implemented in `app/core/combine.py` as one `heapq.merge` pass. A source without a ready
  version fails the build before core is called.
- Cycles can't happen yet: lists can't be edited, so a new combination can only point at lists
  that already exist. When editing arrives, core gets a cycle check (below).

## Later milestones

- M3: version diff (articles added and removed between two versions), given two sorted
  iterators of page IDs.
- With list editing: cycle detection between combinations.
