"""Add the three example lists to an existing account and queue their builds:

    docker compose exec api python -m app.seed you@example.org

Running it twice does not duplicate anything: lists the account already has (by name) are kept.
"""

import argparse
import contextlib
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import SessionLocal, bind_session, make_engine
from app.jobs.build import BuildInProgressError, enqueue_build
from app.models import BuilderKind, CombinationSource, ShelfList, User

WIKI = "en.wikipedia.org"
Example = tuple[str, BuilderKind, dict[str, object]]

CATEGORY: Example = (
    "Example: Vaccines",
    BuilderKind.CATEGORY,
    {"category": "Vaccines", "depth": 1},
)
WIKIDATA: Example = (
    "Example: Universities in Pakistan",
    BuilderKind.WIKIDATA,
    {
        "sparql": (
            "SELECT ?item WHERE {\n"
            "  ?item wdt:P31 wd:Q3918 ;  # instance of: university\n"
            "        wdt:P17 wd:Q843 .   # country: Pakistan\n"
            "}"
        )
    },
)
COMBINATION_NAME = "Example: Vaccines and universities"


def _list(
    session: Session, owner: User, name: str, kind: BuilderKind, params: dict[str, object]
) -> ShelfList:
    existing = session.scalar(
        select(ShelfList).where(ShelfList.owner_id == owner.id, ShelfList.name == name)
    )
    if existing is not None:
        return existing
    shelf = ShelfList(owner_id=owner.id, name=name, wiki=WIKI, builder=kind, params=params)
    session.add(shelf)
    session.flush()
    return shelf


def seed(session: Session, email: str, *, build: bool = True) -> list[ShelfList]:
    owner = session.scalar(select(User).where(User.email == email.lower()))
    if owner is None:
        raise LookupError(f"No account for {email}. Sign up in the app first.")
    category = _list(session, owner, *CATEGORY)
    wikidata = _list(session, owner, *WIKIDATA)
    combination = _list(
        session,
        owner,
        COMBINATION_NAME,
        BuilderKind.COMBINATION,
        {"operation": "union", "sources": [category.id, wikidata.id]},
    )
    if not session.scalar(
        select(CombinationSource).where(CombinationSource.combination_id == combination.id)
    ):
        session.add_all(
            CombinationSource(combination_id=combination.id, position=i, source_list_id=source)
            for i, source in enumerate([category.id, wikidata.id])
        )
    session.commit()
    lists = [category, wikidata, combination]
    if build:
        # The combination rebuilds by itself once both sources are ready.
        for shelf in (category, wikidata):
            with contextlib.suppress(BuildInProgressError):
                enqueue_build(session, shelf)
    return lists


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Add the example lists to an account.")
    parser.add_argument("email", help="email address of an existing account")
    parser.add_argument("--no-build", action="store_true", help="create the lists only")
    args = parser.parse_args(argv)
    bind_session(make_engine(get_settings()))
    session = SessionLocal()
    try:
        lists = seed(session, args.email, build=not args.no_build)
    except LookupError as exc:
        print(exc, file=sys.stderr)
        return 1
    finally:
        session.close()
    for shelf in lists:
        print(f"{shelf.id}\t{shelf.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
