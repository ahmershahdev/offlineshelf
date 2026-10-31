# Project status

Last updated: 2026-11-01. Update at the end of every work session.

## Where we are

M1 skeleton is built on branch `feat/skeleton` (not merged yet), plus security, auth, list CRUD,
the prerendered landing site and the SEO pipeline. Everything runs with `docker compose up`.
Backend: 49 tests pass against MariaDB 11.4 and Redis; ruff and mypy strict are clean. Frontend:
typecheck, ESLint (strictTypeChecked) and Vitest pass; the production build prerenders 4 routes.
Checked in Chrome: WebGL hero renders under the nonce CSP with no console errors; sign up and
create list work through nginx.

`backend/app/core` and `backend/app/wiki` are empty on purpose: the core list logic is the
maintainer's to write (AGENTS.md).

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
proxies `/api`). `npm run dev:down` stops the containers. Needs Docker, uv and Node 22.

## Next session

1. Review and merge `feat/skeleton`, then make `backend`, `frontend` and `codeql` required checks
   in `.github/rulesets/protect-main.json` and the repository settings.
2. M2: the Wikimedia client in `app/wiki` and the builders in `app/core` (maintainer writes core).
3. `POST /lists/<id>/build` that enqueues a build job and creates a `queued` version.

## Known issues

- `npm audit`: moderate advisory in `minimatch` via ESLint and openapi-typescript (dev tooling
  only, not shipped). The suggested fix downgrades typescript-eslint; wait for upstream.
- Docker images pin minor versions (`mariadb:11.4`, `redis:7.4-alpine`,
  `nginx-unprivileged:1.28-alpine`, `python:3.12-slim`, `node:22-alpine`); Dependabot watches them.
- Account deletion is by email for now; an endpoint comes with the account settings page.

## Open questions

- Limits per list (titles 20k, depth 5, SPARQL 10k chars, 60 s) are set in `app/config.py`;
  confirm before M2 ends.
