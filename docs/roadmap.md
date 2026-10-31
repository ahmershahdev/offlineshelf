# Roadmap

Each milestone is a set of small pull requests into `main`. A milestone is done when its
checklist is ticked, CI is green and [status.md](status.md) is updated. Target dates are plans,
not deadlines; GSoC and upstream pull requests come first.

Done for the whole project means: a live demo, a README with setup steps and screenshots, tests
in CI, and seed data.

## M1. Skeleton (target 2026-11-15)

- [x] Flask app factory, config per environment (`dev`, `test`, `prod`), health endpoint
- [x] SQLAlchemy 2 + Alembic against MariaDB 11.4 in Docker Compose (MariaDB in tests too, never SQLite)
- [x] Redis and one RQ worker in Compose; a test job that runs end to end
- [x] pytest with coverage, Ruff, mypy (strict)
- [x] GitHub Actions: `backend` job, CodeQL
- [ ] Add `backend`, `frontend` and `codeql` as required checks in the ruleset
- [x] Extra: accounts (Argon2id), CSRF, rate limits, security headers, list CRUD, OpenAPI contract
- [x] Extra: prerendered landing site with SEO (meta, JSON-LD, sitemap, robots, llms.txt)
- [x] Dependabot for Actions, Python, npm and Docker

## M2. Builders (target 2026-11-29)

- [ ] Wikimedia client: one `User-Agent` with contact details, `maxlag`, retries with backoff,
  continuation handled, responses recorded for tests
- [ ] Pasted list: normalise titles, resolve redirects, report missing pages
- [ ] Category: members in namespace 0, subcategories up to a depth limit, loop-safe
- [ ] Wikidata: SPARQL query, items mapped to articles on the chosen wiki
- [ ] Top by pageviews: top N for a month from the Wikimedia REST API
- [ ] `POST /api/v1/lists`, `GET /api/v1/lists/<id>`, validation and one error format
- [ ] Builder logic in plain Python with 100% branch coverage

## M3. Jobs and schedules (target 2026-12-13)

- [ ] Every build is an RQ job; list status `queued`, `building`, `ready`, `failed`
- [ ] Retries with `Retry` for network errors only; a failed build keeps the last good version
- [ ] Email when a build fails (one per list per day at most)
- [ ] Monthly rebuilds; each build stored as a version with added and removed articles
- [ ] Large lists (100k titles) written in batches without loading everything in memory

## M4. Combinations and exports (target 2026-12-27)

- [ ] Union, intersection and difference of up to 10 lists; no cycles between lists
- [ ] A combination rebuilds when one of its source lists gets a new version
- [ ] Export TSV (title, page ID, revision ID)
- [ ] Export a static HTML bundle (Parsoid HTML, local links rewritten, attribution page)
- [ ] Downloads are streamed and expire after 7 days

## M5. Web app (target 2027-01-17)

- [ ] React + TypeScript + Tailwind app: list overview, builder forms, combination editor
- [ ] Build progress, version history with diffs, download buttons
- [ ] Generated API types from the OpenAPI schema, checked in CI
- [ ] Accessible forms (labels, keyboard, contrast), works on a phone
- [ ] `frontend` CI job added as a required check

## M6. ZIM export, docs and launch (target 2027-02-14)

- [ ] Stretch: ZIM export with `python-libzim` for small lists (articles, main page, metadata)
- [ ] Seed data: three example lists (a category, a Wikidata query, a combination)
- [ ] README setup steps and screenshots
- [ ] Deploy at `offlineshelf.ahmershah.dev`; tag `v1.0.0`
