# AGENTS.md

Guide for coding agents and contributors. Short on purpose: details live in `docs/`, read only when
a task needs them. When a decision changes, update the matching doc in the same PR.

OfflineShelf: build Wikipedia reading lists (by category, Wikidata query, pasted titles or
pageviews), combine them, rebuild them on a schedule and export them for offline use. Owner: Syed
Ahmer Shah, <https://ahmershah.dev>. Goes live at `offlineshelf.ahmershah.dev` in February 2027.

## Read on demand

| Task touches | Read |
|---|---|
| Starting a session | [docs/status.md](docs/status.md) |
| What is done and what is left | [docs/roadmap.md](docs/roadmap.md) |
| API, data model, sources, every decision | [docs/architecture.md](docs/architecture.md) |

## Stack

Python 3.12, Flask, Pydantic 2, SQLAlchemy 2, Alembic, RQ, MariaDB 11.4 (utf8mb4; never SQLite,
even in tests), Redis. React, TypeScript (strict), Vite, Tailwind CSS. pytest, Vitest, Ruff, mypy
(strict), ESLint, Prettier. Docker Compose for dev and prod.

## Layout

```
backend/app/core/    pure list logic (title normalising, builders' result handling, set
                     operations, diffs): no Flask, database or network imports, 100% branch coverage
backend/app/wiki/    the only code that calls Wikimedia APIs (one client, recorded responses in tests)
backend/app/jobs/    RQ jobs; they call core and wiki, never views
backend/app/api/     Flask blueprints, one per area
backend/tests/       mirrors app/
frontend/            React app
docs/                roadmap, architecture, status
```

## Hard rules

- `app/core` is plain Python; views and jobs only call it.
- Every Wikimedia request goes through `app/wiki` with the project `User-Agent` (contact address),
  `maxlag` and backoff. No live API calls in tests.
- Store titles and IDs, never article text. Exports carry CC BY-SA attribution.
- A failed build never replaces the last good version.
- Validate wiki hostnames against an allow list (Wikimedia projects only), titles, SPARQL size and
  every limit (depth, titles, timeout).
- Secrets only from environment variables. Never commit `.env`, dumps or keys.
- API changes update the OpenAPI schema and the frontend types in the same PR.
- No new dependency without a reason in the PR. Pin exact versions.
- The maintainer writes the core list logic himself and must be able to explain every line (this
  project is shown in a Kiwix proposal; Kiwix bans AI-generated code in contributions).
- No emojis in code, UI text or docs.

## Comments

Default is no comment. Write one only for what the code can't say: why it's done this way, an API
or data quirk, a source, or a trap for the next person. Not: restating the code, section banners,
history, owner-less TODOs, or filler (simply, robust, seamless, ensure, leverage, comprehensive).

## Workflow

- Branches `feat/…`, `fix/…`, `docs/…`, `chore/…`. `main` takes PRs only, squash-merged.
- Each PR belongs to a milestone and closes its issue when there is one.
- Commit messages: short, imperative, no prefixes.
- Releases: `v0.x` pre-releases until launch, `v1.0.0` at launch; tag the merge commit, then
  `gh release create vX.Y.Z --verify-tag --generate-notes` (add `--prerelease` before 1.0).
- Update `docs/status.md` at the end of every session.
