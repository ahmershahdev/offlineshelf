# OfflineShelf

**Wikipedia reading lists for places without internet.**

OfflineShelf helps a school, library or clinic decide which Wikipedia articles to carry offline. You
build a list from a category, a Wikidata query, a pasted list of titles or the most-read articles,
combine lists, and export the result as a TSV file, a static HTML bundle or (later) a ZIM file, the
format offline readers such as Kiwix open. Lists can rebuild themselves every month and tell you
what changed.

> Status: early development. The skeleton, accounts and the landing site work; list builders come
> next. See [docs/roadmap.md](docs/roadmap.md) and [docs/status.md](docs/status.md).

## Run it locally

```
cp .env.example .env        # set OFFLINESHELF_SECRET_KEY and the two MariaDB passwords
docker compose up -d --build
```

Then open <http://localhost:8080>. For development with hot reload, run `npm run dev` from the
repo root and open <http://localhost:5173>. Test commands are in [docs/status.md](docs/status.md).

## What it will do

- **Builders.** Make a list from a Wikipedia category (with a depth limit), a Wikidata SPARQL
  query, a pasted list of titles (redirects resolved, missing pages reported), or the top N
  articles by pageviews. Any language edition, for example English or Urdu Wikipedia.
- **Combinations.** Union, intersection and difference of other lists ("Physics minus
  Biographies"), rebuilt when a source list changes.
- **Background jobs.** Every build runs in a queue with status, retries for flaky API calls and
  an email when a build fails.
- **Exports.** TSV of titles and page IDs, a static HTML bundle of the article text, and a ZIM
  file as a stretch goal.
- **Schedules.** Monthly rebuilds with a diff of added and removed articles.

## Stack

| Part | Tools |
|---|---|
| API and jobs | Python 3.12, Flask (app factory, blueprints), Pydantic, SQLAlchemy 2, Alembic, RQ |
| Data | MariaDB 11.4, Redis (queue and cache), MediaWiki Action API, Wikimedia REST API, Wikidata Query Service |
| Web | React, TypeScript (strict), Vite, Tailwind CSS, Lenis, three.js; prerendered for SEO |
| Quality | pytest with recorded API responses, Vitest, Ruff, mypy, ESLint, Prettier, GitHub Actions, CodeQL |
| Run | Docker Compose |

## Why it exists

Picking a few thousand good articles out of millions is the hard part of offline Wikipedia: the
lists have to be reproducible, combinable and kept up to date. OfflineShelf is a small,
self-hostable tool for that step, built on the same ideas (builders, combinations, queued builds)
as Wikimedia's WP1 selection tool, without needing its database replicas.

## Documentation

- [docs/roadmap.md](docs/roadmap.md): milestones M1 to M6 and what "done" means
- [docs/architecture.md](docs/architecture.md): planned API, data model and decisions
- [docs/status.md](docs/status.md): current state, updated every session
- [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md)

## Related

- [HolidayOps](https://github.com/ahmershahdev/holidayops): business-day calendars for countries
  and companies.
- [MarketClock](https://github.com/ahmershahdev/marketclock): trading days and settlement dates
  for stock exchanges.

## License

[MIT](LICENSE). Wikipedia text in exports is under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/);
every export carries the attribution it needs.
