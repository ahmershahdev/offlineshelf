# Architecture (planned)

This is the design before any code. Change it in the same pull request that changes the code.

## Parts

```
React web app  ──>  Flask API  ──>  MariaDB (lists, versions, articles, schedules)
                        │      ──>  Redis (RQ queue, cache)
                        v
                    RQ workers ──>  MediaWiki Action API, Wikimedia REST API,
                                    Wikidata Query Service
```

The API and the workers are the only things that talk to MariaDB, Redis and Wikimedia. The web
app only calls the API. Builds never run inside a web request.

## Where data comes from

| Data | Source | Stored in |
|---|---|---|
| Category members, redirects, page IDs | MediaWiki Action API (`categorymembers`, `query` with `redirects`) | `list_article` per version |
| Items for a query | Wikidata Query Service (SPARQL), mapped to the wiki through sitelinks | `list_article` per version |
| Most-read articles | Wikimedia REST API, `metrics/pageviews/top` | `list_article` per version |
| Article HTML for exports | Wikimedia REST API (Parsoid HTML) | export files only, never in the database |

Rule: OfflineShelf stores titles and IDs, not article text. Text is fetched only while an export
is written, and every export carries the CC BY-SA attribution.

## Data model (first draft)

```
shelf_list       id, name, wiki (for example en.wikipedia.org), builder, params (JSON),
                 schedule, owner_email, created_at
list_version     id, list_id, status, started_at, finished_at, article_count, error
list_article     version_id, page_id, title, revision_id
combination_src  combination_id, source_list_id, operation (union, intersection, difference)
export           id, version_id, format, path, created_at, expires_at
```

## Planned API

```
GET  /api/v1/health
GET  /api/v1/lists                    POST /api/v1/lists
GET  /api/v1/lists/<id>               DELETE /api/v1/lists/<id>
POST /api/v1/lists/<id>/build         GET  /api/v1/lists/<id>/versions
GET  /api/v1/lists/<id>/versions/<v>/diff
POST /api/v1/lists/<id>/exports       GET  /api/v1/exports/<id>
```

## Decisions

| Decision | Why |
|---|---|
| Flask + RQ + MariaDB | The same stack as WP1, so the patterns carry over both ways |
| MariaDB in tests, never SQLite | Collation and JSON behaviour must match production |
| Recorded API responses in tests | No live Wikimedia calls in CI; real calls only in a manual smoke test |
| One `User-Agent` with a contact address, `maxlag`, backoff | Wikimedia's API etiquette; being blocked would stop every build |
| Versions instead of overwriting a list | A failed rebuild must never lose the last good list, and diffs need the previous version |
| ZIM export is a stretch goal | The HTML bundle covers the need first; `python-libzim` adds a native dependency |

## Open questions

- Accounts: email only, or sign in with a Wikimedia account (OAuth) like WP1.
- Where exports live in production: local disk with a size cap, or object storage.
- Upper limits per list (titles, depth, query timeout) before M2 ends.
