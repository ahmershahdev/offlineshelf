import io
import os
import shutil
import time
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest
from sqlalchemy import select

from app.config import get_settings
from app.db import SessionLocal
from app.jobs import export as export_module
from app.jobs.export import delete_expired_exports, run_export
from app.models import (
    ExportStatus,
    ListArticle,
    ListExport,
    ListVersion,
    VersionStatus,
    utcnow,
)
from app.wiki.client import WikiApiError, WikiClient, WikiNetworkError
from tests.api.test_lists import CATEGORY_LIST
from tests.jobs.test_build import work
from tests.wiki.recorded import Replay

GONE = "OfflineShelf no such page 7731"


@pytest.fixture(autouse=True)
def _empty_exports_dir():
    yield
    for path in exports_dir().glob("*"):
        if path.is_dir():
            shutil.rmtree(path)
        else:
            path.unlink()


@pytest.fixture
def replay(monkeypatch):
    transport = Replay("page_html")
    monkeypatch.setattr(
        export_module,
        "make_client",
        lambda: WikiClient(httpx.Client(transport=transport), sleep=lambda _s: None),
    )
    return transport


def exports_dir() -> Path:
    return Path(get_settings().exports_dir)


def ready_version(client, status: VersionStatus = VersionStatus.READY, count: int | None = None):
    list_id = client.send("POST", "/api/v1/lists", CATEGORY_LIST).get_json()["id"]
    version = ListVersion(
        list_id=list_id, status=status, finished_at=datetime(2026, 11, 1, 12), article_count=2
    )
    SessionLocal.add(version)
    SessionLocal.flush()
    SessionLocal.add_all(
        [
            ListArticle(
                version_id=version.id, page_id=31427769, title="Kiwix", revision_id=1375425456
            ),
            ListArticle(version_id=version.id, page_id=99, title=GONE, revision_id=None),
        ]
    )
    if count is not None:
        version.article_count = count
    SessionLocal.commit()
    return list_id, version.id


def exports_url(list_id: int, version_id: int) -> str:
    return f"/api/v1/lists/{list_id}/versions/{version_id}/exports"


def get_export(export_id: int) -> ListExport:
    SessionLocal.expire_all()
    return SessionLocal.get_one(ListExport, export_id)


def queued_export(client) -> tuple[int, int]:
    list_id, version_id = ready_version(client)
    export = ListExport(version_id=version_id, format="html")
    SessionLocal.add(export)
    SessionLocal.commit()
    return list_id, export.id


def test_html_bundle_end_to_end(signed_in, redis, replay) -> None:
    list_id, version_id = ready_version(signed_in)
    resp = signed_in.send("POST", exports_url(list_id, version_id), {"format": "html"})
    assert resp.status_code == 202
    created = resp.get_json()
    assert created["status"] == "queued"
    assert created["total"] == 2

    again = signed_in.send("POST", exports_url(list_id, version_id), {})
    assert again.get_json()["id"] == created["id"]

    work(redis)
    (export,) = signed_in.get(exports_url(list_id, version_id)).get_json()["items"]
    assert export["status"] == "ready"
    assert export["progress"] == 2
    assert export["missing"] == [GONE]
    assert export["size_bytes"] > 0
    assert export["expires_at"].endswith("Z")
    assert not list(exports_dir().glob("*.part"))

    download = signed_in.get(f"/api/v1/lists/{list_id}/exports/{export['id']}/download")
    assert download.status_code == 200
    assert download.mimetype == "application/zip"
    assert f"offlineshelf-{list_id}-v{version_id}.zip" in download.headers["Content-Disposition"]
    with zipfile.ZipFile(io.BytesIO(download.get_data())) as zf:
        assert sorted(zf.namelist()) == ["ATTRIBUTION.html", "articles/31427769.html", "index.html"]
        assert "CC BY-SA 4.0" in zf.read("articles/31427769.html").decode()
    download.close()

    assert signed_in.send("DELETE", f"/api/v1/lists/{list_id}").status_code == 204
    assert not (exports_dir() / f"export-{export['id']}.zip").exists()


def test_export_rules(signed_in, redis) -> None:
    list_id, failed = ready_version(signed_in, VersionStatus.FAILED)
    resp = signed_in.send("POST", exports_url(list_id, failed), {"format": "html"})
    assert resp.status_code == 409

    list_id, big = ready_version(signed_in, count=1001)
    resp = signed_in.send("POST", exports_url(list_id, big), {"format": "html"})
    assert resp.status_code == 422
    assert "TSV" in resp.get_json()["detail"]

    resp = signed_in.send("POST", exports_url(list_id, big), {"format": "zim"})
    assert resp.status_code == 422


def test_downloads_need_a_ready_unexpired_file(app, signed_in) -> None:
    list_id, export_id = queued_export(signed_in)
    url = f"/api/v1/lists/{list_id}/exports/{export_id}/download"
    assert signed_in.get(url).status_code == 404

    export = get_export(export_id)
    export.status = ExportStatus.READY
    export.file_name = f"export-{export_id}.zip"
    export.expires_at = utcnow() + timedelta(days=1)
    SessionLocal.commit()
    assert signed_in.get(url).status_code == 410

    (exports_dir() / f"export-{export_id}.zip").write_bytes(b"PK")
    resp = signed_in.get(url)
    assert resp.status_code == 200
    resp.close()

    other = type(signed_in)(app.test_client())
    other.send(
        "POST",
        "/api/v1/auth/register",
        {"email": "other@example.org", "password": "another long password"},
    )
    assert other.get(url).status_code == 404

    export = get_export(export_id)
    export.expires_at = utcnow() - timedelta(seconds=1)
    SessionLocal.commit()
    assert signed_in.get(url).status_code == 410


def test_network_error_with_retries_left_requeues(signed_in, monkeypatch) -> None:
    _, export_id = queued_export(signed_in)

    def broken():
        return SimpleNamespace(page_html=_raise(WikiNetworkError("HTTP 503")), close=lambda: None)

    monkeypatch.setattr(export_module, "make_client", broken)
    monkeypatch.setattr(export_module, "get_current_job", lambda: SimpleNamespace(retries_left=1))
    with pytest.raises(WikiNetworkError):
        run_export(export_id)
    export = get_export(export_id)
    assert export.status is ExportStatus.QUEUED
    assert export.error == "Retrying: HTTP 503"
    assert not list(exports_dir().glob(f"export-{export_id}*"))


@pytest.mark.parametrize(
    ("error", "message"),
    [
        (WikiNetworkError("HTTP 503"), "HTTP 503"),
        (WikiApiError("HTTP 403"), "HTTP 403"),
        (RuntimeError("boom"), "The export failed unexpectedly."),
    ],
)
def test_failures_mark_the_export_failed(signed_in, monkeypatch, error, message) -> None:
    _, export_id = queued_export(signed_in)
    monkeypatch.setattr(
        export_module,
        "make_client",
        lambda: SimpleNamespace(page_html=_raise(error), close=lambda: None),
    )
    run_export(export_id)
    export = get_export(export_id)
    assert export.status is ExportStatus.FAILED
    assert export.error == message
    assert export.expires_at is not None


def test_finished_or_missing_exports_are_skipped(signed_in, replay) -> None:
    _, export_id = queued_export(signed_in)
    run_export(export_id)
    run_export(export_id)
    run_export(999_999)
    assert len(replay.requests) == 2


def test_progress_is_saved_while_running(signed_in, replay, monkeypatch) -> None:
    monkeypatch.setattr(export_module, "PROGRESS_EVERY", 1)
    seen: list[int] = []
    real_commit = SessionLocal.session_factory.class_.commit

    def spy(self):
        for obj in self.dirty:
            if isinstance(obj, ListExport):
                seen.append(obj.progress)
        real_commit(self)

    monkeypatch.setattr(SessionLocal.session_factory.class_, "commit", spy)
    _, export_id = queued_export(signed_in)
    run_export(export_id)
    assert 1 in seen


def test_cleanup_removes_expired_exports_and_stale_files(signed_in) -> None:
    _, keep_id = queued_export(signed_in)
    _, old_id = queued_export(signed_in)
    old = get_export(old_id)
    old.status = ExportStatus.READY
    old.file_name = f"export-{old_id}.zip"
    old.expires_at = utcnow() - timedelta(minutes=1)
    SessionLocal.commit()
    (exports_dir() / old.file_name).write_bytes(b"PK")
    stale = exports_dir() / "export-424242.zip.part"
    stale.write_bytes(b"")
    week_ago = time.time() - 8 * 86400
    os.utime(stale, (week_ago, week_ago))
    fresh = exports_dir() / "export-434343.zip"
    fresh.write_bytes(b"")

    assert delete_expired_exports() == 1
    SessionLocal.expire_all()
    assert SessionLocal.scalars(select(ListExport.id)).all() == [keep_id]
    assert not (exports_dir() / f"export-{old_id}.zip").exists()
    assert not stale.exists()
    assert fresh.exists()
    fresh.unlink()


def test_cleanup_removes_stale_folders_too(signed_in) -> None:
    stale = exports_dir() / "export-99.zim.part_fulltext.idx.tmp"
    stale.mkdir()
    (stale / "segment").write_bytes(b"x")
    week_ago = time.time() - 8 * 86400
    os.utime(stale, (week_ago, week_ago))
    delete_expired_exports()
    assert not stale.exists()


def test_cleanup_without_a_directory(monkeypatch, tmp_path) -> None:
    settings = get_settings().model_copy(update={"exports_dir": str(tmp_path / "none")})
    monkeypatch.setattr(export_module, "get_settings", lambda: settings)
    assert delete_expired_exports() == 0


def _raise(error: Exception):
    def fail(*_args):
        raise error

    return fail


def test_zim_export_end_to_end(signed_in, redis, replay) -> None:
    from libzim.reader import Archive  # type: ignore[import-untyped]

    list_id, version_id = ready_version(signed_in)
    resp = signed_in.send("POST", exports_url(list_id, version_id), {"format": "zim"})
    assert resp.status_code == 202
    html = signed_in.send("POST", exports_url(list_id, version_id), {"format": "html"})
    assert html.get_json()["id"] != resp.get_json()["id"]
    work(redis)

    items = signed_in.get(exports_url(list_id, version_id)).get_json()["items"]
    zim = next(e for e in items if e["format"] == "zim")
    assert zim["status"] == "ready"
    assert zim["missing"] == [GONE]
    download = signed_in.get(f"/api/v1/lists/{list_id}/exports/{zim['id']}/download")
    assert download.mimetype == "application/x-zim"
    assert f"offlineshelf-{list_id}-v{version_id}.zim" in download.headers["Content-Disposition"]
    path = exports_dir() / f"download-{zim['id']}.zim"
    path.write_bytes(download.get_data())
    download.close()
    archive = Archive(str(path))
    assert archive.has_entry_by_path("articles/31427769.html")
    assert archive.main_entry.get_item().path == "index.html"
    del archive
    assert not [p for p in exports_dir().iterdir() if ".part" in p.name]
