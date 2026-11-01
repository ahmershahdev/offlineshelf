from datetime import timedelta

import pytest
from sqlalchemy import select

from app.db import SessionLocal
from app.jobs import notify
from app.jobs.notify import send_failure_email
from app.models import ListVersion, ShelfList, VersionStatus, utcnow
from app.wiki.client import WikiApiError
from tests.jobs.test_build import create_list, version, work


@pytest.fixture
def outbox(monkeypatch):
    sent: list[dict[str, str]] = []

    def fake(_settings, to, subject, body):
        sent.append({"to": to, "subject": subject, "body": body})
        return True

    monkeypatch.setattr(notify, "send_email", fake)
    return sent


def add_version(list_id: int, status: VersionStatus, error: str | None = "Boom") -> int:
    v = ListVersion(list_id=list_id, status=status, error=error)
    SessionLocal.add(v)
    SessionLocal.commit()
    return v.id


def notified_at(version_id: int):
    v = SessionLocal.get_one(ListVersion, version_id)
    SessionLocal.refresh(v)
    return v.notified_at


def test_a_failed_build_emails_the_owner(signed_in, redis, outbox, builder) -> None:
    builder.result = lambda: WikiApiError("MediaWiki error: the category does not exist")
    list_id = create_list(signed_in)
    signed_in.send("POST", f"/api/v1/lists/{list_id}/build")
    work(redis)

    v = version(list_id, signed_in)
    assert v["status"] == "failed"
    assert len(outbox) == 1
    assert outbox[0]["to"] == "reader@example.org"
    assert outbox[0]["subject"] == "Build failed: Vaccines"
    assert "the category does not exist" in outbox[0]["body"]
    assert "http://localhost/app" in outbox[0]["body"]
    assert notified_at(int(v["id"])) is not None


def test_at_most_one_email_per_list_per_day(signed_in, outbox) -> None:
    list_id = create_list(signed_in)
    first = add_version(list_id, VersionStatus.FAILED)
    second = add_version(list_id, VersionStatus.FAILED)
    send_failure_email(first)
    send_failure_email(second)
    assert len(outbox) == 1
    assert notified_at(second) is None

    v = SessionLocal.get_one(ListVersion, first)
    v.notified_at = utcnow() - timedelta(days=1, minutes=1)
    SessionLocal.commit()
    send_failure_email(second)
    assert len(outbox) == 2


def test_other_lists_are_counted_separately(signed_in, outbox) -> None:
    a = add_version(create_list(signed_in), VersionStatus.FAILED)
    b = add_version(create_list(signed_in), VersionStatus.FAILED)
    send_failure_email(a)
    send_failure_email(b)
    assert len(outbox) == 2


def test_only_failed_unsent_versions_are_emailed(signed_in, outbox) -> None:
    list_id = create_list(signed_in)
    ready = add_version(list_id, VersionStatus.READY, error=None)
    failed = add_version(list_id, VersionStatus.FAILED, error=None)
    send_failure_email(ready)
    send_failure_email(999_999)
    assert outbox == []
    send_failure_email(failed)
    send_failure_email(failed)
    assert len(outbox) == 1
    assert "Reason: unknown" in outbox[0]["body"]


def test_without_smtp_nothing_is_recorded(signed_in) -> None:
    failed = add_version(create_list(signed_in), VersionStatus.FAILED)
    send_failure_email(failed)
    assert notified_at(failed) is None


def test_an_smtp_error_leaves_the_version_unsent_for_a_retry(signed_in, monkeypatch) -> None:
    def broken(*_args):
        raise OSError("connection refused")

    monkeypatch.setattr(notify, "send_email", broken)
    failed = add_version(create_list(signed_in), VersionStatus.FAILED)
    with pytest.raises(OSError, match="refused"):
        send_failure_email(failed)
    assert notified_at(failed) is None


def test_sending_does_not_bump_the_list_row_version(signed_in, outbox) -> None:
    list_id = create_list(signed_in)
    before = SessionLocal.scalar(select(ShelfList.row_version).where(ShelfList.id == list_id))
    send_failure_email(add_version(list_id, VersionStatus.FAILED))
    SessionLocal.expire_all()
    after = SessionLocal.scalar(select(ShelfList.row_version).where(ShelfList.id == list_id))
    assert before == after
