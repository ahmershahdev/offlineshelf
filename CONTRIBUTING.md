# Contributing

Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).

OfflineShelf is in its planning stage. Issues and ideas are welcome; for code, please open an
issue first so we can agree on the approach.

## Wrong article content

OfflineShelf only picks articles; the text comes from Wikipedia. If an article is wrong, fix it on
Wikipedia. If OfflineShelf picked the wrong articles for a list, open an issue here with the list
settings.

## Pull requests

- One change per pull request, into `main`, squash-merged.
- Branch names: `feat/…`, `fix/…`, `docs/…`, `chore/…`.
- Tests and linters must pass. List logic in `backend/app/core` needs 100% branch coverage.
- Tests use recorded Wikimedia API responses, never live calls.
- Read [AGENTS.md](AGENTS.md) for the code rules and [docs/](docs/) for the design.

## AI use

The maintainer uses an AI assistant for setup, docs and reviews. The core list logic is written by
the maintainer, and he reviews, tests and can explain every line that is merged.
