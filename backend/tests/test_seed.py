import pytest
from sqlalchemy import select

from app import seed as seed_module
from app.db import SessionLocal
from app.jobs.queue import get_queue
from app.models import CombinationSource, ListVersion, ShelfList


def names() -> list[str]:
    return list(SessionLocal.scalars(select(ShelfList.name).order_by(ShelfList.id)))


def test_seeds_three_lists_once_and_queues_the_sources(signed_in, redis) -> None:
    lists = seed_module.seed(SessionLocal(), "Reader@Example.org")
    assert names() == [
        "Example: Vaccines",
        "Example: Universities in Pakistan",
        "Example: Vaccines and universities",
    ]
    category, wikidata, combination = lists
    assert combination.params == {"operation": "union", "sources": [category.id, wikidata.id]}
    sources = SessionLocal.scalars(
        select(CombinationSource.source_list_id).order_by(CombinationSource.position)
    ).all()
    assert sources == [category.id, wikidata.id]
    queued = SessionLocal.scalars(select(ListVersion.list_id).order_by(ListVersion.id)).all()
    assert queued == [category.id, wikidata.id]
    assert len(get_queue(connection=redis).job_ids) == 2

    seed_module.seed(SessionLocal(), "reader@example.org")
    assert len(names()) == 3
    assert len(SessionLocal.scalars(select(CombinationSource)).all()) == 2
    assert len(SessionLocal.scalars(select(ListVersion)).all()) == 2


def test_lists_only(signed_in) -> None:
    seed_module.seed(SessionLocal(), "reader@example.org", build=False)
    assert SessionLocal.scalars(select(ListVersion)).all() == []


def test_unknown_account(app) -> None:
    with pytest.raises(LookupError, match="Sign up"):
        seed_module.seed(SessionLocal(), "nobody@example.org")


def test_command_line(signed_in, monkeypatch, capsys) -> None:
    monkeypatch.setattr(seed_module, "bind_session", lambda _engine: None)
    monkeypatch.setattr(seed_module, "make_engine", lambda _settings: None)
    assert seed_module.main(["reader@example.org", "--no-build"]) == 0
    assert "Example: Vaccines" in capsys.readouterr().out
    assert seed_module.main(["nobody@example.org"]) == 1
    assert "No account" in capsys.readouterr().err
