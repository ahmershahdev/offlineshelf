# Architecture

Change this file in the same pull request that changes the code.

## Parts

```
Browser ──> nginx (web) ──> static prerendered site (React, Vite)
                  │
                  └── /api ──> gunicorn + Flask API ──> MariaDB (users, lists, versions, articles)
                                      │            ──> Redis (rate limits, RQ queue)
                                      v
                                 RQ workers ──> MediaWiki Action API, Wikimedia REST API,
                                                Wikidata Query Service
```

The API and the workers are the only things that talk to MariaDB, Redis and Wikimedia. The web
app only calls the API. Builds never run inside a web request.

## Code layout

| Path | Holds |
|---|---|
| `backend/app/core/` | Pure list logic, written by the maintainer (see AGENTS.md). Empty until M2. |
| `backend/app/wiki/` | The only code that calls Wikimedia. Empty until M2. |
| `backend/app/api/` | Blueprints: `health`, `auth`, `lists`; `errors.py` (problem+json), `util.py` |
| `backend/app/security/` | Password hashing, CSRF, session cookie, headers, rate limits, wiki allow list |
| `backend/app/jobs/` | RQ queue and jobs (`ping` for now) |
| `backend/app/schemas.py` | Pydantic request and response models; all input limits live here |
| `backend/migrations/` | Alembic |
| `frontend/src/seo/` | Route table (titles, descriptions, JSON-LD), head rendering |
| `frontend/src/webgl/` | The hero scene (three.js, custom shaders) |
| `frontend/scripts/` | `images.mjs` (raster assets), `prerender.mjs` (HTML, sitemap, robots), `compress.mjs` |
| `frontend/nginx/` | nginx config: CSP nonce, caching, edge rate limits |
| `docs/openapi.yaml` | API contract; frontend types are generated from it, a backend test checks routes match |

## Where data comes from

| Data | Source | Stored in |
|---|---|---|
| Category members, redirects, page IDs | MediaWiki Action API (`categorymembers`, `query` with `redirects`) | `list_article` per version |
| Items for a query | Wikidata Query Service (SPARQL), mapped to the wiki through sitelinks | `list_article` per version |
| Most-read articles | Wikimedia REST API, `metrics/pageviews/top` | `list_article` per version |
| Article HTML for exports | Wikimedia REST API (Parsoid HTML) | export files only, never in the database |

Rule: OfflineShelf stores titles and IDs, not article text.

## Data model

Built (migration `512c42b8a106`):

```
user          id, email (unique), password_hash, session_epoch, created_at
shelf_list    id, owner_id, name, wiki, builder, params (JSON), schedule, row_version, created_at
list_version  id, list_id, status, started_at, finished_at, article_count, error
list_article  id, version_id, page_id, title (utf8mb4_bin), revision_id; unique (version_id, page_id)
```

Planned for M4: `combination_src (combination_id, source_list_id, operation)`,
`export (id, version_id, format, path, created_at, expires_at)`.

## API

Built: see `docs/openapi.yaml`. Planned next: `POST /lists/<id>/build`, `GET /lists/<id>/versions`,
`GET /lists/<id>/versions/<v>/diff`, `POST /lists/<id>/exports`, `GET /exports/<id>`.

## Security

| Threat | Defence | Where |
|---|---|---|
| SQL injection | SQLAlchemy with bound parameters only; no string-built SQL. Test stores SQL metacharacters as data | `app/api/*`, `tests/api/test_lists.py` |
| XSS | API returns JSON only with `default-src 'none'`. React escapes output. JSON-LD escapes `<`, U+2028, U+2029. Site CSP: nonce + `strict-dynamic`, no inline styles in markup | `security/headers.py`, `seo/head.ts`, `nginx/default.conf` |
| CSP nonce | Vite writes `__CSP_NONCE__` into every tag it emits; nginx replaces it with `$request_id` (per request, CSPRNG) and puts the same value in the header. HTML is not precompressed so `sub_filter` works | `vite.config.ts`, `nginx/default.conf`, `scripts/compress.mjs` |
| CSRF | `SameSite=Lax` cookie, `Sec-Fetch-Site`/`Origin` check, and a per-session token in `X-CSRF-Token` compared in constant time. Token rotates on login and logout | `security/csrf.py` |
| Passwords | Argon2id (RFC 9106 profile), rehash on login when parameters change, 12 to 256 characters, dummy hash for unknown emails so timing is equal, same error for wrong email and wrong password | `security/passwords.py`, `api/auth.py` |
| Sessions | Signed cookie, `HttpOnly`, `Secure` and `__Host-` prefix in prod, cleared on login (no fixation), `session_epoch` for logout everywhere | `security/session.py` |
| Brute force, DoS | nginx: per-IP request and connection limits, short body/header timeouts, 2 MB bodies. Flask-Limiter (Redis, moving window): default per IP, auth per IP and per email, writes. Gunicorn request line/field limits and 30 s timeout. 1 MB JSON cap. Every input has an upper bound | `nginx/default.conf`, `security/ratelimit.py`, `gunicorn.conf.py`, `schemas.py` |
| Spoofed client IP | nginx overwrites `X-Forwarded-For`; `ProxyFix` trusts exactly `OFFLINESHELF_TRUSTED_PROXIES` hops | `app/__init__.py` |
| SSRF via wiki | Hostname allow list (Wikimedia content projects only) | `security/wiki_hosts.py` |
| IDOR | Every list query filters by owner; others' lists are 404, not 403 | `api/lists.py` |
| Concurrency | Per-user list cap checked under `SELECT ... FOR UPDATE`; `row_version` optimistic locking returns 409 on lost updates; `READ-COMMITTED` isolation; DB pool sized to gunicorn threads | `api/lists.py`, `models.py`, `deploy/mariadb` |
| Leaky errors | One problem+json format; validation errors never echo input; 500s log the trace, return nothing | `api/errors.py` |
| Containers | Non-root users, read-only root filesystems, `cap_drop: ALL`, `no-new-privileges`, DB and Redis bound to 127.0.0.1 | `compose.yaml`, Dockerfiles |
| Secrets | Environment only, `.env` git-ignored, settings refuse a short secret key or a non-MariaDB URL | `config.py` |

Typing: mypy strict and Pydantic on the backend; TypeScript strict with
`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, and typescript-eslint
`strictTypeChecked` on the frontend. API types are generated, not written by hand.

## SEO

- Every public route is prerendered to static HTML at build time from one route table
  (`frontend/src/seo/routes.ts`). The same table produces `sitemap.xml` and `robots.txt`.
- Titles under 60 characters and descriptions under 140, enforced by `routes.test.ts`.
- Each page: canonical (indexable pages only), robots, Open Graph, Twitter card, JSON-LD
  (`WebSite`, `WebPage`, `Person`, `WebApplication`, `FAQPage`, `BreadcrumbList`).
- `/app` is `noindex` and disallowed in robots; the 404 page is served with status 404.
- `llms.txt` and `llms-full.txt` in `frontend/public`. Update `llms-full.txt` when page copy changes.
- Images come from `scripts/images.mjs`: WebP for page images, PNG for `og:image` (some crawlers
  ignore WebP there). Fonts are self-hosted WOFF2 subsets. Assets are precompressed (gzip, brotli).
- Base URL comes from `VITE_SITE_URL` (default `https://offlineshelf.ahmershah.dev`).

## Frontend

React 19, React Router 7, Tailwind 4, Lenis for smooth scrolling, three.js for the hero.
three.js loads lazily after first paint and is skipped when WebGL is missing or Save-Data is on.
With `prefers-reduced-motion`, Lenis, the custom cursor and animations are off and the hero
renders one still frame. The custom cursor only appears with a fine pointer.

## Decisions

| Decision | Why |
|---|---|
| Flask + RQ + MariaDB | The same stack as WP1, so the patterns carry over both ways |
| MariaDB in tests, never SQLite | Collation and JSON behaviour must match production |
| Recorded API responses in tests | No live Wikimedia calls in CI; real calls only in a manual smoke test |
| One `User-Agent` with a contact address, `maxlag`, backoff | Wikimedia's API etiquette; being blocked would stop every build |
| Versions instead of overwriting a list | A failed rebuild must never lose the last good list, and diffs need the previous version |
| ZIM export is a stretch goal | The HTML bundle covers the need first; `python-libzim` adds a native dependency |
| Email and password accounts (Argon2id) first | Works for self-hosters without registering an OAuth app; Wikimedia OAuth can be added beside it |
| Prerendered SPA instead of a Node SSR server | Public pages are static; one fewer runtime to run and secure, and nginx can set the nonce |
| PyMySQL driver | Pure Python, same on Windows, Linux and CI; speed is irrelevant next to Wikimedia API latency |
| TypeScript 5.9, not 7 | openapi-typescript and typescript-eslint do not support 6 or 7 yet |
| Cookie sessions, not server-side | No session store to run; `session_epoch` covers revocation |

## Open questions

- Where exports live in production: local disk with a size cap, or object storage.
- Brotli in production: needs an nginx build with the brotli module (`.br` files are already built).
