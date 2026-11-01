# Contributing

Thanks for helping. Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).

## Ways to help

- **Try it with a real collection** and tell us what was missing or confusing.
- **Report bugs** with the [bug template](https://github.com/ahmershahdev/offlineshelf/issues/new/choose).
- **Suggest features** with the feature template; say who it helps and how.
- **Improve the docs** or the [wiki](https://github.com/ahmershahdev/offlineshelf/wiki).
- **Send code**: for anything larger than a small fix, open an issue first so we can agree on the
  approach before you spend time on it.

Security problems go through [SECURITY.md](SECURITY.md), never a public issue.

## Wrong article content

OfflineShelf only picks articles; the text comes from Wikipedia. If an article is wrong, fix it on
Wikipedia. If OfflineShelf picked the wrong articles for a list, open an issue with the list
settings (wiki, builder and parameters) and what you expected.

## Set up

You need Docker with Compose v2, [uv](https://docs.astral.sh/uv/) and Node 24.

```
git clone https://github.com/ahmershahdev/offlineshelf.git
cd offlineshelf
cp .env.example .env        # set the secret key and the two MariaDB passwords
npm run dev                 # MariaDB and Redis in Docker, Flask and Vite with hot reload
```

Open <http://localhost:5173>. The full stack with a worker and the scheduler:
`docker compose up -d --build`, then <http://localhost:8080>.

## Checks

Run these before opening a pull request; CI runs the same.

```
cd backend
uv run ruff format --check . && uv run ruff check . && uv run mypy app
OFFLINESHELF_TEST_DATABASE_URL="mariadb+pymysql://offlineshelf:<MARIADB_PASSWORD>@127.0.0.1:3306/offlineshelf_test" uv run pytest --cov

cd ../frontend
npm run lint && npm run typecheck && npm test
```

- Tests run against MariaDB and Redis, never SQLite, and never call live Wikimedia APIs: use the
  recordings in `backend/tests/wiki/recordings` or the fakes in `backend/tests/core/fakes.py`.
- `backend/app/core` keeps 100% branch coverage; CI fails below it.
- API changes update `docs/openapi.yaml` and the generated types (`npm run api-types`) in the same
  pull request.

## Pull requests

- One change per pull request, into `main`, squash-merged.
- Branch names: `feat/…`, `fix/…`, `docs/…`, `chore/…`, `test/…`.
- Commit messages: short and imperative, no prefixes ("Add ZIM export", not "feat: added ZIM").
- Fill in the pull request template: what changed, why, and how you tested it.
- No new dependency without a reason in the pull request; pin exact versions.
- Read [AGENTS.md](AGENTS.md) for the code rules (comments, layout, hard rules) and
  [docs/](docs/) for the design.
