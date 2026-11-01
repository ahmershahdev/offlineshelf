from types import SimpleNamespace

import pytest
from sqlalchemy import select

from app.contract import BuildResult, Page
from app.core import combine as core_combine
from app.db import SessionLocal
from app.jobs import build as build_module
from app.jobs.build import BuilderNotImplementedError, resolve_combiner, run_build
from app.models import CombinationSource, ListArticle, ListVersion, VersionStatus
from tests.jobs.test_build import version, work

PASTED = {"wiki": "en.wikipedia.org", "params": {"kind": "pasted", "titles": ["A"]}}


@pytest.fixture
def combiner(monkeypatch):
    """The real combiner is the maintainer's (app/core); this stand-in records its input."""
    state = SimpleNamespace(calls=[])

    def fake(operation, sources, limits):
        inputs = [list(s) for s in sources]
        state.calls.append({"operation": operation, "inputs": inputs, "limits": limits})
        ids = [{p.page_id for p in pages} for pages in inputs]
        keep = set.union(*ids) if operation == "union" else set.intersection(*ids)
        if operation == "difference":
            keep = ids[0].difference(*ids[1:])
        first = {p.page_id: p for pages in reversed(inputs) for p in pages}
        return BuildResult((first[i] for i in sorted(keep)), {"result": len(keep)})

    monkeypatch.setattr(build_module, "resolve_combiner", lambda: fake)
    return state


def make_list(client, name: str, wiki: str = "en.wikipedia.org") -> int:
    resp = client.send("POST", "/api/v1/lists", {**PASTED, "name": name, "wiki": wiki})
    assert resp.status_code == 201
    return int(resp.get_json()["id"])


def ready(list_id: int, page_ids: list[int]) -> int:
    v = ListVersion(list_id=list_id, status=VersionStatus.READY, article_count=len(page_ids))
    SessionLocal.add(v)
    SessionLocal.flush()
    SessionLocal.add_all(
        ListArticle(version_id=v.id, page_id=p, title=f"Page {p}", revision_id=p * 10)
        for p in page_ids
    )
    SessionLocal.commit()
    return v.id


def combine(client, operation: str, sources: list[int], **extra):
    body = {
        "name": f"{operation} list",
        "wiki": "en.wikipedia.org",
        "params": {"kind": "combination", "operation": operation, "sources": sources},
        **extra,
    }
    return client.send("POST", "/api/v1/lists", body)


def build_now(list_id: int) -> int:
    v = ListVersion(list_id=list_id, status=VersionStatus.QUEUED)
    SessionLocal.add(v)
    SessionLocal.commit()
    version_id = v.id
    run_build(version_id)
    return version_id


def test_combination_builds_from_the_latest_ready_versions(signed_in, combiner) -> None:
    a, b = make_list(signed_in, "A"), make_list(signed_in, "B")
    ready(a, [1, 2])
    va = ready(a, [5, 3, 1])
    vb = ready(b, [3, 4])
    resp = combine(signed_in, "intersection", [a, b])
    assert resp.status_code == 201
    created = resp.get_json()
    assert created["builder"] == "combination"
    assert created["params"] == {"operation": "intersection", "sources": [a, b]}
    rows = SessionLocal.scalars(select(CombinationSource).order_by(CombinationSource.position))
    assert [(r.position, r.source_list_id) for r in rows] == [(0, a), (1, b)]

    version_id = build_now(created["id"])
    call = combiner.calls[0]
    assert call["operation"] == "intersection"
    assert [[p.page_id for p in pages] for pages in call["inputs"]] == [[1, 3, 5], [3, 4]]
    assert call["inputs"][0][0] == Page(page_id=1, title="Page 1", namespace=0, revision_id=10)
    v = SessionLocal.get_one(ListVersion, version_id)
    SessionLocal.refresh(v)
    assert v.status is VersionStatus.READY
    assert v.article_count == 1
    assert v.report == {"result": 1, "source_versions": [va, vb]}


def test_sources_are_read_in_sorted_batches(signed_in, combiner, monkeypatch) -> None:
    monkeypatch.setattr(build_module, "SOURCE_BATCH", 2)
    a, b = make_list(signed_in, "A"), make_list(signed_in, "B")
    ready(a, [9, 7, 5, 3, 1])
    ready(b, [2])
    build_now(combine(signed_in, "union", [a, b]).get_json()["id"])
    assert [p.page_id for p in combiner.calls[0]["inputs"][0]] == [1, 3, 5, 7, 9]


def test_a_source_without_a_ready_version_fails_the_build(signed_in, combiner) -> None:
    a, b = make_list(signed_in, "A"), make_list(signed_in, "Never built")
    ready(a, [1])
    version_id = build_now(combine(signed_in, "union", [a, b]).get_json()["id"])
    v = SessionLocal.get_one(ListVersion, version_id)
    SessionLocal.refresh(v)
    assert v.status is VersionStatus.FAILED
    assert v.error == 'The source list "Never built" has no ready version yet.'
    assert combiner.calls == []


def test_without_the_core_combiner_the_build_fails_clearly(signed_in, monkeypatch) -> None:
    monkeypatch.delattr(core_combine, "combine")
    with pytest.raises(BuilderNotImplementedError):
        resolve_combiner()
    a, b = make_list(signed_in, "A"), make_list(signed_in, "B")
    ready(a, [1])
    ready(b, [2])
    version_id = build_now(combine(signed_in, "union", [a, b]).get_json()["id"])
    v = SessionLocal.get_one(ListVersion, version_id)
    SessionLocal.refresh(v)
    assert v.error == "The combination builder is not implemented yet."


def test_the_real_combiner_end_to_end(signed_in) -> None:
    a, b = make_list(signed_in, "A"), make_list(signed_in, "B")
    va = ready(a, [5, 1, 3, 7])
    vb = ready(b, [3, 4, 7])
    version_id = build_now(combine(signed_in, "difference", [a, b]).get_json()["id"])
    v = SessionLocal.get_one(ListVersion, version_id)
    SessionLocal.refresh(v)
    assert v.status is VersionStatus.READY
    assert v.article_count == 2
    assert v.report == {
        "operation": "difference",
        "inputs": [4, 3],
        "result": 2,
        "source_versions": [va, vb],
    }
    kept = SessionLocal.scalars(
        select(ListArticle.page_id).where(ListArticle.version_id == version_id)
    ).all()
    assert sorted(kept) == [1, 5]


def test_a_new_source_version_rebuilds_its_combinations(
    signed_in, redis, builder, combiner
) -> None:
    a, b = make_list(signed_in, "A"), make_list(signed_in, "B")
    ready(b, [1, 2])
    combo = combine(signed_in, "difference", [a, b]).get_json()["id"]
    assert signed_in.send("POST", f"/api/v1/lists/{a}/build").status_code == 202
    work(redis)
    assert version(a, signed_in)["status"] == "ready"
    combined = version(combo, signed_in)
    assert combined["status"] == "ready"
    assert combined["article_count"] == 1
    assert combiner.calls[0]["operation"] == "difference"


def test_a_combination_already_building_is_not_queued_twice(signed_in, builder) -> None:
    a, b = make_list(signed_in, "A"), make_list(signed_in, "B")
    combo = combine(signed_in, "union", [a, b]).get_json()["id"]
    SessionLocal.add(ListVersion(list_id=combo, status=VersionStatus.BUILDING))
    SessionLocal.commit()
    build_now(a)
    statuses = SessionLocal.scalars(
        select(ListVersion.status).where(ListVersion.list_id == combo)
    ).all()
    assert statuses == [VersionStatus.BUILDING]


@pytest.mark.parametrize(
    ("sources", "extra"),
    [
        ("dup", {}),
        ("one", {}),
        ("eleven", {}),
        ("missing", {}),
        ("other_wiki", {}),
        ("someone_else", {}),
    ],
)
def test_combination_sources_are_validated(app, signed_in, sources, extra) -> None:
    a, b = make_list(signed_in, "A"), make_list(signed_in, "B")
    ids = {
        "dup": [a, a],
        "one": [a],
        "eleven": [a, b, *range(1000, 1009)],
        "missing": [a, 99_999],
        "other_wiki": [a, make_list(signed_in, "German", "de.wikipedia.org")],
    }
    if sources == "someone_else":
        other = type(signed_in)(app.test_client())
        other.send(
            "POST",
            "/api/v1/auth/register",
            {"email": "other@example.org", "password": "another long password"},
        )
        ids["someone_else"] = [a, make_list(other, "Theirs")]
    resp = combine(signed_in, "union", ids[sources], **extra)
    assert resp.status_code == 422
    assert SessionLocal.scalars(select(CombinationSource)).all() == []


def test_a_list_used_by_a_combination_cannot_be_deleted(signed_in) -> None:
    a, b = make_list(signed_in, "A"), make_list(signed_in, "B")
    combo = combine(signed_in, "union", [a, b]).get_json()["id"]
    resp = signed_in.send("DELETE", f"/api/v1/lists/{a}")
    assert resp.status_code == 409
    assert "union list" in resp.get_json()["detail"]
    assert signed_in.send("DELETE", f"/api/v1/lists/{combo}").status_code == 204
    assert signed_in.send("DELETE", f"/api/v1/lists/{a}").status_code == 204
