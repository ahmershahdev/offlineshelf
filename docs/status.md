# Project status

Last updated: 2026-11-01. Update at the end of every work session.

## Where we are

- **M1 Skeleton:** done (PR #1, #9).
- **M2 Builders:** infrastructure done (PR #10): Wikimedia client (`app/wiki`), shared types
  (`app/contract.py`), build job (`app/jobs/build.py`), build/versions/articles API, recorded
  responses in `backend/tests/wiki/recordings`. Builders done: `app/core/builders.py` (pasted,
  category, Wikidata, pageviews), smoke-tested live against en.wikipedia.org. Core was written
  with AI assistance at the maintainer's request (see AGENTS.md).
- **M3 Jobs:** failure emails done: `app/jobs/notify.py` emails the owner when a build fails,
  at most once per list per day, over SMTP (`app/mail.py`, off while `OFFLINESHELF_SMTP_HOST` is
  empty; production uses Resend). Monthly rebuilds done: the `scheduler` service runs
  `app/jobs/schedule.py` hourly and queues lists not built this month.
- **M5 Web app:** `/app` has a Details panel per list: build history with errors and reports,
  articles of a ready version with paging and links to the wiki, live status while building.
  API timestamps now carry `Z` (UTC).
- **M4 Exports:** TSV export done (`/versions/<vid>/export.tsv`, streamed, attribution lines),
  with a Download TSV link in the Details panel. HTML bundle done: Parsoid HTML per article,
  links rewritten, index and attribution pages, zipped on the `exports-data` volume, 7-day expiry
  with hourly cleanup, Make/Download HTML bundle in the Details panel.
- **M4 Combinations:** infrastructure done: `combination` builder kind, `combination_source`
  table, source checks, delete guard, rebuild on a source's new version, form in `/app`, and
  `app/core/combine.py` (one merge pass over sorted sources).
- **M6:** seed command (`python -m app.seed <email>` adds three example lists and builds them),
  README with setup steps and screenshots (`docs/screenshots`).
- **Robustness:** the scheduler runs `recover_stalled` hourly: builds and exports whose RQ job
  died with its worker are marked failed instead of blocking the list. Combinations are queued
  automatically only once every source has a ready version.
- **Site:** 13 public pages, Fraunces/Geist type, torch cursor with grab states, draggable example
  shelf, brand emblem icons, security.txt, contact details (support@ahmershah.dev,
  ahmershah.dev) (PR #11). The `/app` page signs in, creates, builds and deletes lists.
- **Repo:** only `main`, no open PRs. `main` requires `backend`, `frontend`, `codeql (python)`
  and `codeql (javascript-typescript)`, squash merges, linear history.
- Tests: 189 backend (MariaDB 11.4 + Redis), 36 frontend.

## Run it

```
cp .env.example .env        # then set the three secrets
docker compose up -d --build
open http://localhost:8080
```

Backend tests (MariaDB and Redis from compose must be up):

```
cd backend
OFFLINESHELF_TEST_DATABASE_URL="mariadb+pymysql://offlineshelf:<MARIADB_PASSWORD>@127.0.0.1:3306/offlineshelf_test" uv run pytest --cov
```

Development with hot reload, from the repo root: `npm run dev`. It starts MariaDB and Redis in
Docker, applies migrations, and runs the Flask API (port 5000) and Vite (http://localhost:5173,
proxies `/api`). `npm run dev:down` stops the containers. Needs Docker, uv and Node 24.

## Next session

1. Maintainer: write `backend/app/core/builders.py` (pasted titles first, then category,
   Wikidata, pageviews) and `backend/app/core/combine.py`, with 100% branch coverage, per
   `docs/core-contract.md`.
2. Read the About page copy and confirm it says what you want about yourself.
3. M3: version diff (added and removed articles) once core has a diff function. The 100k-article
   build and export are tested (`tests/jobs/test_large_list.py`).
4. M5: diffs between versions and download buttons (after M4 exports); check `/app` on a phone.
5. Install SonarQube Cloud and CodeRabbit on the repository (needs the owner's GitHub
   authorisation), then add them as required checks in `.github/rulesets/protect-main.json`.

## Known issues

- `npm audit`: moderate advisory in `minimatch` via ESLint and openapi-typescript (dev tooling
  only, not shipped). The suggested fix downgrades typescript-eslint; wait for upstream.
- Docker images pin minor versions (`mariadb:11.4`, `redis:8.0-alpine`,
  `nginx-unprivileged:1.30-alpine`, `python:3.12-slim`, `node:24-alpine`). Dependabot ignores
  bumps that would leave those lines (Python 3.12, MariaDB 11.4 LTS, Node LTS, nginx stable,
  TypeScript 5); those upgrades are made on purpose.
- Failure emails have no opt-out yet; add one with the account settings page.
- Account deletion is by email for now; an endpoint comes with the account settings page.

## Open questions

- Limits per list (titles 20k, depth 5, SPARQL 10k chars, 60 s) are set in `app/config.py`;
  confirm before M2 ends.
