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
- [x] Add `backend`, `frontend` and `codeql` as required checks in the ruleset
- [x] Extra: accounts (Argon2id), CSRF, rate limits, security headers, list CRUD, OpenAPI contract
- [x] Extra: prerendered landing site with SEO (meta, JSON-LD, sitemap, robots, llms.txt)
- [x] Dependabot for Actions, Python, npm and Docker

## M2. Builders (target 2026-11-29)

- [x] Wikimedia client: one `User-Agent` with contact details, `maxlag`, retries with backoff,
  continuation handled, responses recorded for tests
- [x] Pasted list: normalise titles, resolve redirects, report missing pages
- [x] Category: members in namespace 0, subcategories up to a depth limit, loop-safe
- [x] Wikidata: SPARQL query, items mapped to articles on the chosen wiki
- [x] Top by pageviews: top N for a month from the Wikimedia REST API
- [x] `POST /api/v1/lists`, `GET /api/v1/lists/<id>`, validation and one error format
- [x] Build pipeline: `POST /lists/<id>/build`, versions, articles; builders plug in via `app/core/builders.py` ([core-contract.md](core-contract.md))
- [x] Builder logic in plain Python with 100% branch coverage (CI gate)

## M3. Jobs and schedules (target 2026-12-13)

- [x] Every build is an RQ job; list status `queued`, `building`, `ready`, `failed`
- [x] Retries with `Retry` for network errors only; a failed build keeps the last good version
- [x] Email when a build fails (one per list per day at most)
- [x] Monthly rebuilds (hourly dispatcher, `scheduler` service)
- [ ] Each version stores its added and removed articles (needs the diff function in core)
- [x] Large lists (100k titles) written in batches without loading everything in memory (tested: build peaks near 2 MiB, TSV export near 3 MiB)

## M4. Combinations and exports (target 2026-12-27)

- [x] Combinations of up to 10 lists: API, sources table, build job, form in `/app` ([core-contract.md](core-contract.md))
- [x] Union, intersection and difference in `app/core/combine.py`
- [x] A combination rebuilds when one of its source lists gets a new version
- [x] Export TSV (title, page ID, revision ID), streamed, with attribution lines
- [x] Export a static HTML bundle (Parsoid HTML, local links rewritten, attribution page)
- [x] Downloads are streamed and expire after 7 days

## M5. Web app (target 2027-01-17)

- [ ] React + TypeScript + Tailwind app: list overview, builder forms, combination editor
- [x] Build progress (polls while a build runs), version history, articles per version
- [ ] Diffs between versions, download buttons
- [ ] Generated API types from the OpenAPI schema, checked in CI
- [x] Accessible forms (labels, keyboard, contrast), works on a phone
- [ ] `frontend` CI job added as a required check

## M6. ZIM export, docs and launch (target 2027-02-14)

- [ ] Stretch: ZIM export with `python-libzim` for small lists (articles, main page, metadata)
- [x] Seed data: three example lists (a category, a Wikidata query, a combination): `python -m app.seed <email>`
- [x] README setup steps and screenshots
- [ ] Deploy at `offlineshelf.ahmershah.dev`; tag `v1.0.0`
