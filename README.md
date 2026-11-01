# OfflineShelf

**Wikipedia reading lists for places without internet.**

OfflineShelf helps a school, library or clinic decide which Wikipedia articles to carry offline. You
build a list from a category, a Wikidata query, a pasted list of titles or the most-read articles,
combine lists, rebuild them every month, and export the result as a TSV file or a static HTML
bundle that opens from a USB stick. ZIM export for Kiwix comes next.

> Status: every builder, combinations, schedules and both exports work end to end. Public launch
> at `offlineshelf.ahmershah.dev` in February 2027. See [docs/roadmap.md](docs/roadmap.md) and
> [docs/status.md](docs/status.md).

![The OfflineShelf home page](docs/screenshots/home.jpg)

## What it does

- **Builders.** Make a list from a Wikipedia category (breadth-first, loop-safe, depth limit), a
  Wikidata SPARQL query (items mapped to articles through sitelinks), a pasted list of titles
  (normalised, redirects followed, missing pages reported), or the top N articles by pageviews
  for a month. Any language edition of eight Wikimedia projects.
- **Combinations.** Union, intersection and difference of 2 to 10 lists ("Vaccines minus
  Companies"), rebuilt automatically when a source list gets a new version.
- **Versions.** Every build is a new version with its article count and a report of what could
  not be found. A failed build never replaces the last good version, and each article is pinned
  to a revision.
- **Schedules and emails.** Monthly rebuilds that catch up after downtime; one email a day at
  most when a build fails.
- **Exports.** A streamed TSV of titles, page IDs and revision IDs, and an HTML bundle: Parsoid
  HTML per article with local links rewritten, an index and an attribution page. Downloads expire
  after seven days.
- **API.** Everything the app does goes through a documented JSON API
  ([docs/openapi.yaml](docs/openapi.yaml)).

![Build history and articles of a combination in the app](docs/screenshots/app.jpg)

## Run it

You need Docker with Compose v2.

```
git clone https://github.com/ahmershahdev/offlineshelf.git
cd offlineshelf
cp .env.example .env
# set OFFLINESHELF_SECRET_KEY and the two MariaDB passwords in .env; a key:
python -c "import secrets; print(secrets.token_urlsafe(48))"
docker compose up -d --build
```

Open <http://localhost:8080>, create an account, then add the example lists (a category, a
Wikidata query and a combination of the two) and build them:

```
docker compose exec api python -m app.seed you@example.org
```

Failure emails are off until you set the `OFFLINESHELF_SMTP_*` variables in `.env` (any SMTP
provider; the hosted instance uses Resend). Everything else, from limits to proxies, is on the
[self-hosting page](https://offlineshelf.ahmershah.dev/self-host) and in
[docs/architecture.md](docs/architecture.md).

### Development

`npm run dev` from the repo root starts MariaDB and Redis in Docker, applies migrations, and runs
the Flask API and Vite with hot reload at <http://localhost:5173>. It needs uv and Node 24.

Backend tests run against MariaDB and Redis from Compose (never SQLite, never the live Wikimedia
APIs):

```
cd backend
OFFLINESHELF_TEST_DATABASE_URL="mariadb+pymysql://offlineshelf:<MARIADB_PASSWORD>@127.0.0.1:3306/offlineshelf_test" uv run pytest --cov
cd ../frontend && npm test
```

## How it works

![The five steps every list goes through](docs/screenshots/pipeline.jpg)

The web app only asks; an RQ worker does the fetching from the MediaWiki Action API, the Wikimedia
REST API and the Wikidata Query Service, with a contact User-Agent, `maxlag` and backoff. Builds
write titles and IDs, never article text; article text is fetched only while an HTML bundle is
written.

![What is inside an HTML bundle](docs/screenshots/bundle.jpg)

## Stack

| Part | Tools |
|---|---|
| API and jobs | Python 3.12, Flask, Pydantic 2, SQLAlchemy 2, Alembic, RQ (worker and cron scheduler) |
| Data | MariaDB 11.4, Redis, MediaWiki Action API, Wikimedia REST API, Wikidata Query Service |
| Web | React, TypeScript (strict), Vite, Tailwind CSS; prerendered pages for SEO |
| Quality | pytest with recorded API responses, Vitest, Ruff, mypy (strict), ESLint, Prettier, CodeQL; `app/core` at 100% branch coverage |
| Run | Docker Compose: web (nginx), api, worker, scheduler, MariaDB, Redis |

## Why it exists

Picking a few thousand good articles out of millions is the hard part of offline Wikipedia: the
lists have to be reproducible, combinable and kept up to date. OfflineShelf is a small,
self-hostable tool for that step, built on the same ideas (builders, combinations, queued builds)
as Wikimedia's WP1 selection tool, without needing its database replicas.

## Documentation

- [docs/roadmap.md](docs/roadmap.md): milestones M1 to M6 and what "done" means
- [docs/architecture.md](docs/architecture.md): API, data model, sources and every decision
- [docs/core-contract.md](docs/core-contract.md): the interface between the list logic and the rest
- [docs/status.md](docs/status.md): current state, updated every session
- [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and [SECURITY.md](SECURITY.md)

## Related

- [HolidayOps](https://github.com/ahmershahdev/holidayops): business-day calendars for countries
  and companies.
- [MarketClock](https://github.com/ahmershahdev/marketclock): trading days and settlement dates
  for stock exchanges.

## License

[MIT](LICENSE). Wikipedia text in exports is under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/);
every export carries the attribution it needs.
