from collections.abc import Iterator
from types import SimpleNamespace

import pytest
from rq import SimpleWorker
from sqlalchemy import func, select

from app.contract import BuildResult, Page
from app.db import SessionLocal
from app.jobs import build as build_module
from app.jobs.build import BuilderNotImplementedError, resolve_builder, run_build
from app.jobs.queue import get_queue
from app.models import BuilderKind, ListArticle, ListVersion, VersionStatus
from app.wiki.client import WikiApiError, WikiNetworkError
from tests.jobs.conftest import pages

LIST = {
    "name": "Vaccines",
    "wiki": "en.wikipedia.org",
    "params": {"kind": "category", "category": "Vaccines", "depth": 1},
}


def create_list(client) -> int:
    resp = client.send("POST", "/api/v1/lists", LIST)
    assert resp.status_code == 201
    return int(resp.get_json()["id"])


def work(redis) -> None:
    SimpleWorker([get_queue(connection=redis)], connection=redis).work(burst=True)


def version(list_id: int, client) -> dict[str, object]:
    items = client.get(f"/api/v1/lists/{list_id}/versions").get_json()["items"]
    return items[0]


def test_build_end_to_end(signed_in, redis, builder) -> None:
    list_id = create_list(signed_in)
    resp = signed_in.send("POST", f"/api/v1/lists/{list_id}/build")
    assert resp.status_code == 202
    assert resp.get_json()["status"] == "queued"

    work(redis)
    v = version(list_id, signed_in)
    assert v["status"] == "ready"
    assert v["article_count"] == 3
    assert v["report"] == {"missing": []}
    assert str(v["finished_at"]).endswith("Z")
    assert builder.calls[0]["params"] == {"category": "Vaccines", "depth": 1}
    assert builder.calls[0]["limits"].max_category_depth == 5

    arts = signed_in.get(f"/api/v1/lists/{list_id}/versions/{v['id']}/articles?limit=2").get_json()
    assert [a["title"] for a in arts["items"]] == ["Article 1", "Article 2"]
    rest = signed_in.get(
        f"/api/v1/lists/{list_id}/versions/{v['id']}/articles?cursor={arts['next_cursor']}"
    ).get_json()
    assert [a["page_id"] for a in rest["items"]] == [3]
    assert rest["next_cursor"] is None
    assert signed_in.get(f"/api/v1/lists/{list_id}").get_json()["latest_status"] == "ready"


def test_second_build_while_one_is_queued_conflicts(signed_in, redis, builder) -> None:
    list_id = create_list(signed_in)
    assert signed_in.send("POST", f"/api/v1/lists/{list_id}/build").status_code == 202
    assert signed_in.send("POST", f"/api/v1/lists/{list_id}/build").status_code == 409
    work(redis)
    assert signed_in.send("POST", f"/api/v1/lists/{list_id}/build").status_code == 202


def test_failed_build_keeps_the_last_good_version(signed_in, redis, builder) -> None:
    list_id = create_list(signed_in)
    signed_in.send("POST", f"/api/v1/lists/{list_id}/build")
    work(redis)

    builder.result = lambda: WikiApiError("MediaWiki error badtitle: Bad title")
    signed_in.send("POST", f"/api/v1/lists/{list_id}/build")
    work(redis)

    failed, good = signed_in.get(f"/api/v1/lists/{list_id}/versions").get_json()["items"]
    assert failed["status"] == "failed"
    assert "badtitle" in failed["error"]
    assert good["status"] == "ready"
    count = SessionLocal.scalar(
        select(func.count()).select_from(ListArticle).where(ListArticle.version_id == good["id"])
    )
    assert count == 3


def test_crash_mid_write_leaves_no_partial_articles(signed_in, redis, builder) -> None:
    def exploding() -> Iterator[Page]:
        yield from pages(1500)
        raise RuntimeError("boom")

    builder.result = lambda: BuildResult(exploding())
    list_id = create_list(signed_in)
    signed_in.send("POST", f"/api/v1/lists/{list_id}/build")
    work(redis)

    v = version(list_id, signed_in)
    assert v["status"] == "failed"
    assert v["error"] == "The build failed unexpectedly."
    assert "boom" not in str(v["error"])
    assert SessionLocal.scalar(select(func.count()).select_from(ListArticle)) == 0


def test_article_limit(app, signed_in, redis, builder, monkeypatch) -> None:
    monkeypatch.setattr(build_module, "get_settings", lambda: app.extensions["settings"])
    monkeypatch.setattr(app.extensions["settings"], "max_articles_per_list", 1500)
    builder.result = lambda: BuildResult(pages(2001))
    list_id = create_list(signed_in)
    signed_in.send("POST", f"/api/v1/lists/{list_id}/build")
    work(redis)
    v = version(list_id, signed_in)
    assert v["status"] == "failed"
    assert "more than 1,500 articles" in str(v["error"])


def _queued_version(signed_in) -> int:
    list_id = create_list(signed_in)
    SessionLocal.add(ListVersion(list_id=list_id, status=VersionStatus.QUEUED))
    SessionLocal.commit()
    return int(SessionLocal.scalar(select(func.max(ListVersion.id))) or 0)


def test_network_error_with_retries_left_requeues(signed_in, builder, monkeypatch) -> None:
    builder.result = lambda: WikiNetworkError("Gave up after 5 retries: HTTP 503")
    monkeypatch.setattr(build_module, "get_current_job", lambda: SimpleNamespace(retries_left=2))
    version_id = _queued_version(signed_in)
    with pytest.raises(WikiNetworkError):
        run_build(version_id)
    v = SessionLocal.get_one(ListVersion, version_id)
    SessionLocal.refresh(v)
    assert v.status is VersionStatus.QUEUED
    assert v.error is not None
    assert v.error.startswith("Retrying")


def test_network_error_on_last_attempt_fails(signed_in, builder) -> None:
    builder.result = lambda: WikiNetworkError("Gave up after 5 retries: HTTP 503")
    version_id = _queued_version(signed_in)
    run_build(version_id)
    v = SessionLocal.get_one(ListVersion, version_id)
    SessionLocal.refresh(v)
    assert v.status is VersionStatus.FAILED


def test_finished_or_missing_versions_are_skipped(signed_in, builder) -> None:
    version_id = _queued_version(signed_in)
    run_build(version_id)
    run_build(version_id)
    run_build(999_999)
    assert len(builder.calls) == 1


def test_builds_need_the_owner(app, signed_in, builder) -> None:
    list_id = create_list(signed_in)
    other = type(signed_in)(app.test_client())
    other.send(
        "POST", "/api/v1/auth/register", {"email": "o@example.org", "password": "another password"}
    )
    assert other.send("POST", f"/api/v1/lists/{list_id}/build").status_code == 404
    assert other.get(f"/api/v1/lists/{list_id}/versions").status_code == 404
    assert signed_in.get(f"/api/v1/lists/{list_id}/versions/123456").status_code == 404


def test_missing_core_builder_fails_with_a_clear_message() -> None:
    with pytest.raises(BuilderNotImplementedError, match="category builder is not implemented"):
        resolve_builder(BuilderKind.CATEGORY)


def test_unimplemented_builder_fails_the_build(signed_in, redis, monkeypatch) -> None:
    monkeypatch.setattr(
        build_module, "make_source", lambda wiki, _settings: SimpleNamespace(wiki=wiki)
    )
    list_id = create_list(signed_in)
    signed_in.send("POST", f"/api/v1/lists/{list_id}/build")
    work(redis)
    v = version(list_id, signed_in)
    assert v["status"] == "failed"
    assert v["error"] == "The category builder is not implemented yet."
