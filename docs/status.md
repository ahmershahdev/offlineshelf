# Project status

Last updated: 2026-11-01. `main` requires `backend`, `frontend` and both CodeQL checks to pass. Update at the end of every work session.

## Where we are

M1 done. M2: the Wikimedia client, the build pipeline (build, versions, articles API) and the
core contract (`docs/core-contract.md`) are merged; the four builders in `app/core` are the
maintainer's to write. The site has 13 public pages, the Fraunces/Geist type system, a torch
cursor with grab states, and your contact details (support@ahmershah.dev, ahmershah.dev).

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

1. Maintainer: `app/core/builders.py` with the four builders, per `docs/core-contract.md`.
2. M3: version diffs (needs a core diff function), monthly schedules, failure emails.
3. Install SonarQube Cloud and CodeRabbit on the repository, then add them as required checks.

## Known issues

- `npm audit`: moderate advisory in `minimatch` via ESLint and openapi-typescript (dev tooling
  only, not shipped). The suggested fix downgrades typescript-eslint; wait for upstream.
- Docker images pin minor versions (`mariadb:11.4`, `redis:8.0-alpine`,
  `nginx-unprivileged:1.30-alpine`, `python:3.12-slim`, `node:24-alpine`). Dependabot ignores
  bumps that would leave those lines (Python 3.12, MariaDB 11.4 LTS, Node LTS, nginx stable,
  TypeScript 5); those upgrades are made on purpose.
- Account deletion is by email for now; an endpoint comes with the account settings page.

## Open questions

- Limits per list (titles 20k, depth 5, SPARQL 10k chars, 60 s) are set in `app/config.py`;
  confirm before M2 ends.
