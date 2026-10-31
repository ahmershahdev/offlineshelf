# Project status

Last updated: 2026-10-31. Update at the end of every work session.

## Where we are

Planning. The repository, roadmap, architecture draft, rulesets and GitHub milestones are set up;
no code yet. Next: M1 (skeleton), see [roadmap.md](roadmap.md).

## Next session

1. M1: Flask app factory, Docker Compose with MariaDB 11.4, Redis and one RQ worker, pytest, Ruff,
   mypy.
2. Add the `backend` and `codeql` CI jobs, then make them required checks in the "Protect main"
   ruleset (`.github/rulesets/protect-main.json` and the repository settings).

## Open questions

- Accounts: email only, or Wikimedia OAuth.
- Limits per list (titles, category depth, SPARQL timeout).
