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
| `backend/app/core/` | Pure list logic, written by the maintainer (see AGENTS.md and [core-contract.md](core-contract.md)) |
| `backend/app/contract.py` | Standard-library types shared by core and the job: `Page`, `TitleBatch`, `WikiSource`, `Builder` |
| `backend/app/wiki/` | The only code that calls Wikimedia: `client.py` (User-Agent, maxlag, retries, continuation), `source.py` (implements `WikiSource`) |
| `backend/app/api/` | Blueprints: `health`, `auth`, `lists`; `errors.py` (problem+json), `util.py` |
| `backend/app/security/` | Password hashing, CSRF, session cookie, headers, rate limits, wiki allow list |
| `backend/app/jobs/` | RQ queue; `build.py` queues and runs builds; `notify.py` sends failure emails; `schedule.py` queues monthly rebuilds; `export.py` builds HTML bundles and deletes expired ones |
| `backend/app/scheduler.py` | The `scheduler` process: RQ `CronScheduler` that enqueues the dispatcher every hour |
| `backend/app/exports.py` | Export formats: TSV header with attribution and rows |
| `backend/app/bundle.py` | HTML bundle: rewrites Parsoid HTML for offline reading, writes the zip with index and attribution pages |
| `backend/app/mail.py` | Plain-text email over SMTP (standard library); off when `OFFLINESHELF_SMTP_HOST` is empty |
| `backend/scripts/record_wiki.py` | Re-records the Wikimedia responses in `tests/wiki/recordings` (manual, never in CI) |
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

Built (migrations `512c42b8a106`, `7f9fad1c53cf`):

```
user          id, email (unique), password_hash, session_epoch, created_at
shelf_list    id, owner_id, name, wiki, builder, params (JSON), schedule, row_version, created_at
combination_source  combination_id, position, source_list_id (RESTRICT on delete)
list_version  id, list_id, status, started_at, finished_at, article_count, error, report (JSON),
              notified_at
list_article  id, version_id, page_id, title (utf8mb4_bin), revision_id; unique (version_id, page_id)
list_export   id, version_id, format, status, file_name, size_bytes, progress, missing (JSON),
              error, created_at, finished_at, expires_at
```


## API

Built: see `docs/openapi.yaml` (health, auth, lists, build, versions, articles). Planned next:
`GET /lists/<id>/versions/<v>/diff` (M3), `POST /lists/<id>/exports` and `GET /exports/<id>` (M4).

## Builds

1. `POST /lists/<id>/build` locks the list row, refuses with 409 if a version is queued or
   building, creates a `queued` version and enqueues `run_build` (job ID `build-<version>`).
2. The worker marks it `building`, calls the core builder through `WikiSource`, and writes the
   articles in batches of 1000 inside one transaction.
3. Success: `ready` with the count and the builder's report. `WikiNetworkError` with retries
   left: back to `queued` and RQ retries after 1, 5 and 15 minutes. Anything else: `failed`,
   partial rows rolled back, earlier versions untouched. Unexpected errors are logged and shown
   to the user only as "The build failed unexpectedly."
4. A `failed` version enqueues `send_failure_email` (job ID `failure-email-<version>`). It locks
   the list row and skips the email if any version of the list has a `notified_at` in the last
   24 hours, so the owner gets at most one email per list per day. `notified_at` is set only
   after SMTP accepts the message; an SMTP error raises and RQ retries after 1, 5 and 15 minutes.

### Combinations

A list with `builder = combination` has `{"operation", "sources"}` in `params` and one
`combination_source` row per source (order kept, for difference). Sources must be the owner's
lists on the same wiki (422 otherwise); a list used by a combination can't be deleted (409).
The build job reads each source's latest ready version as an iterator sorted by `page_id`
(keyset batches of 5000, so nothing sits in memory whole) and hands them to
`app/core/combine.py`; a source with no ready version fails the build. When any version becomes
`ready`, the job queues a build for every combination that uses that list, so chains of
combinations update in turn. A combination already queued or building is not queued again.
Lists can't be edited yet, so a cycle can't form.

### Monthly rebuilds

The `scheduler` service enqueues `dispatch_scheduled_builds` every hour. It queues a build (step 1
above) for each list with `schedule = monthly` that has no version queued, building or started
since the 1st of the current month (UTC). A new monthly list is built within the hour. A failed
build counts for the month: the owner is emailed and can rebuild by hand. Running the dispatcher
twice, or after downtime, never builds a list twice in a month or skips one.

## Exports

`GET /lists/<id>/versions/<vid>/export.tsv` streams a ready version (409 otherwise) as UTF-8 TSV,
reading 5000 rows at a time by `list_article.id`, so memory stays flat for 100k-article lists.
Before the column header (`title`, `page_id`, `revision_id`) come `#` lines with the list name,
source wiki, build time and the CC BY-SA 4.0 notice; MediaWiki titles can never start with `#`.
An empty `revision_id` means the builder did not report one.

HTML bundles (`POST /lists/<id>/versions/<vid>/exports`, ready versions of up to
`OFFLINESHELF_MAX_BUNDLE_ARTICLES`, default 1000) are an RQ job (`export-<id>`):

1. For each article, `WikiClient.page_html` fetches Parsoid HTML of the stored revision from
   `/w/rest.php/v1/revision/<id>/html` (or the page by title when no revision is known), one
   request at a time.
2. `app/bundle.py` drops `<base>` and scripts, points links to bundled articles at
   `articles/<page_id>.html` (keeping `#fragments`), sends other links to the wiki, makes
   protocol-relative and root-relative URLs absolute, adds a small reader stylesheet and an
   attribution footer (revision link, CC BY-SA 4.0, page history).
3. The zip also holds `index.html` (pages that no longer exist are listed apart) and
   `ATTRIBUTION.html`. It is written to `<file>.part` and renamed when complete.
4. Files live in `OFFLINESHELF_EXPORTS_DIR` (the `exports-data` volume shared by `api` and
   `worker`) for `OFFLINESHELF_EXPORT_DAYS` (7). The scheduler runs `delete_expired_exports`
   hourly; it also removes files older than that with no row (crashes, deleted lists). Deleting
   a list deletes its files at once. Expired downloads answer 410.

Images are linked, not bundled; each keeps its own licence on Commons.

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

React 19, React Router 8, Tailwind 4, Lenis for smooth scrolling, three.js for the hero, lucide
icons. Type: Fraunces (variable, with the SOFT and WONK axes) for display, Geist for text, Geist
Mono for code, all self-hosted.

- Pages: home, how it works, builders, exports, developers, self-hosting, roadmap, FAQ, about,
  security, contact, privacy, terms, the app and a 404. Content pages share `components/Page.tsx`.
- Cursor (`components/Cursor.tsx`): a flickering torch light over a slightly darkened page; a
  disc with an optional label (`data-cursor-label`) over links; an open hand over
  `data-cursor="grab"` areas and a closed hand while dragging; a caret over inputs. The hero
  shader has a matching warm point light under the pointer.
- three.js loads lazily after first paint and is skipped when WebGL is missing or Save-Data is
  on. With `prefers-reduced-motion`, Lenis, the cursor and animations are off and the hero renders
  one still frame. The cursor only appears with a fine pointer; touch keeps native scrolling.
- Hover effects apply only with a real mouse or trackpad: Tailwind's `hover` variant is redefined
  as `(hover: hover) and (pointer: fine)` (so `group-hover` follows), and every custom `:hover` rule
  in `index.css` sits in the same media query. Keyboard focus keeps the same effects everywhere.
- Brand assets come from `src/assets/source/brand` (the emblem); `scripts/images.mjs` builds the
  favicon, app icons (including a maskable one), header emblem and the share image.
- `/.well-known/security.txt` (RFC 9116) is generated at build time with a fresh expiry.

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
| httpx for Wikimedia | Timeouts and connection pooling built in; `MockTransport` replays recordings without a mocking library |
| Neutral `app/contract.py` | Core stays importable without Flask, SQLAlchemy or httpx, and is tested with fakes |
| SMTP with `smtplib`, no mail library or provider SDK | Any provider speaks SMTP; one fewer dependency; self-hosters use their own server |
| Hourly idempotent dispatcher, not a cron entry on the 1st | A cron run missed during downtime would wait a month; the hourly check catches up and needs no extra state |
| Combinations as a builder kind with a sources table | One list model, one build pipeline and one versions API for every list; the table makes "who uses this list" one indexed query and lets the database refuse deleting a source |
| Exports on local disk, not object storage | Self-hosters need nothing extra; bundles are capped at 1000 articles and expire in 7 days, so the disk stays small |
| Bundle files named by page ID | Titles can hold characters that are unsafe or ambiguous in file names (`:` on Windows, case folding on macOS) |
| TSV attribution in `#` lines, not a separate file | One file to hand around; `#` can never start a title, and most TSV readers can skip comment lines |
| Naive UTC in the database, `Z` in the API | MariaDB `DATETIME` has no zone; the response schemas attach UTC so browsers show local time correctly |
| Failure email timestamp on `list_version` | Writing to `shelf_list` would bump `row_version` and turn the owner's next edit into a false 409 |
| Pageviews project without `.org` | The REST API answers 404 for `en.wikipedia.org`; it wants `en.wikipedia` |

## Open questions

- Brotli in production: needs an nginx build with the brotli module (`.br` files are already built).
