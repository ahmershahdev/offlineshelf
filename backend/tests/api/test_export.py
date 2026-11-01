from datetime import datetime

from app.api import lists as lists_module
from app.db import SessionLocal
from app.exports import tsv_header
from app.models import ListArticle, ListVersion, VersionStatus
from tests.api.test_lists import CATEGORY_LIST


def make_version(client, status: VersionStatus = VersionStatus.READY, articles: int = 3):
    list_id = client.send("POST", "/api/v1/lists", CATEGORY_LIST).get_json()["id"]
    version = ListVersion(
        list_id=list_id,
        status=status,
        finished_at=datetime(2026, 11, 1, 12, 30),
        article_count=articles,
    )
    SessionLocal.add(version)
    SessionLocal.flush()
    for i in range(1, articles + 1):
        SessionLocal.add(
            ListArticle(
                version_id=version.id,
                page_id=100 + i,
                title=f"Article {i}",
                revision_id=None if i == 2 else 5000 + i,
            )
        )
    SessionLocal.commit()
    return list_id, version.id


def url(list_id: int, version_id: int) -> str:
    return f"/api/v1/lists/{list_id}/versions/{version_id}/export.tsv"


def test_exports_a_ready_version_with_attribution(signed_in) -> None:
    list_id, version_id = make_version(signed_in)
    resp = signed_in.get(url(list_id, version_id))
    assert resp.status_code == 200
    assert resp.content_type == "text/tab-separated-values; charset=utf-8"
    assert resp.headers["Content-Disposition"] == (
        f'attachment; filename="offlineshelf-{list_id}-v{version_id}.tsv"'
    )
    lines = resp.get_data(as_text=True).splitlines()
    comments = [line for line in lines if line.startswith("#")]
    assert comments[0] == f"# {CATEGORY_LIST['name']}"
    assert "https://en.wikipedia.org/ as of 2026-11-01T12:30:00Z" in comments[1]
    assert "CC BY-SA 4.0" in comments[2]
    assert "http://localhost" in comments[3]
    assert lines[len(comments) :] == [
        "title\tpage_id\trevision_id",
        "Article 1\t101\t5001",
        "Article 2\t102\t",
        "Article 3\t103\t5003",
    ]


def test_streams_in_batches(signed_in, monkeypatch) -> None:
    monkeypatch.setattr(lists_module, "EXPORT_BATCH", 2)
    list_id, version_id = make_version(signed_in, articles=5)
    rows = signed_in.get(url(list_id, version_id)).get_data(as_text=True).splitlines()[5:]
    assert [r.split("\t")[1] for r in rows] == ["101", "102", "103", "104", "105"]


def test_an_empty_version_has_only_the_header(signed_in) -> None:
    list_id, version_id = make_version(signed_in, articles=0)
    lines = signed_in.get(url(list_id, version_id)).get_data(as_text=True).splitlines()
    assert lines[-1] == "title\tpage_id\trevision_id"


def test_only_ready_versions_export(signed_in) -> None:
    list_id, version_id = make_version(signed_in, VersionStatus.FAILED, articles=0)
    resp = signed_in.get(url(list_id, version_id))
    assert resp.status_code == 409
    assert resp.get_json()["detail"] == "Only a ready version can be exported."


def test_someone_elses_export_is_404(app, signed_in) -> None:
    list_id, version_id = make_version(signed_in)
    other = type(signed_in)(app.test_client())
    other.send(
        "POST",
        "/api/v1/auth/register",
        {"email": "other@example.org", "password": "another long password"},
    )
    assert other.get(url(list_id, version_id)).status_code == 404
    assert signed_in.get(url(list_id, version_id + 1)).status_code == 404


def test_header_flattens_the_name_and_handles_no_build_time() -> None:
    header = tsv_header("Two\nlines", "de.wikipedia.org", None, "https://example.org")
    assert header.splitlines()[0] == "# Two lines"
    assert "as of unknown" in header
