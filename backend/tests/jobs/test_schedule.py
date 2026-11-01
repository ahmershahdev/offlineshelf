from datetime import datetime, timedelta

from sqlalchemy import select

from app.db import SessionLocal
from app.jobs import build as build_module
from app.jobs import schedule
from app.jobs.export import delete_expired_exports
from app.jobs.queue import get_queue
from app.jobs.schedule import dispatch_scheduled_builds, month_start
from app.models import ListVersion, VersionStatus, utcnow
from app.scheduler import make_scheduler
from tests.jobs.test_build import LIST


def create(client, schedule_value: str = "monthly") -> int:
    resp = client.send("POST", "/api/v1/lists", {**LIST, "schedule": schedule_value})
    assert resp.status_code == 201
    return int(resp.get_json()["id"])


def add_version(list_id: int, status: VersionStatus, started_at: datetime | None) -> None:
    SessionLocal.add(ListVersion(list_id=list_id, status=status, started_at=started_at))
    SessionLocal.commit()


def versions(list_id: int) -> list[ListVersion]:
    SessionLocal.expire_all()
    return list(
        SessionLocal.scalars(
            select(ListVersion).where(ListVersion.list_id == list_id).order_by(ListVersion.id)
        )
    )


def test_month_start() -> None:
    assert month_start(datetime(2026, 11, 17, 13, 5, 9, 12)) == datetime(2026, 11, 1)


def test_queues_monthly_lists_without_a_build_this_month(signed_in, redis) -> None:
    monthly = create(signed_in)
    manual = create(signed_in, "none")

    assert dispatch_scheduled_builds() == 1
    queued = versions(monthly)
    assert [v.status for v in queued] == [VersionStatus.QUEUED]
    assert versions(manual) == []
    assert get_queue(connection=redis).job_ids == [f"build-{queued[0].id}"]

    assert dispatch_scheduled_builds() == 0


def test_a_build_from_last_month_is_due_again(signed_in, redis) -> None:
    list_id = create(signed_in)
    last_month = month_start(utcnow()) - timedelta(seconds=1)
    add_version(list_id, VersionStatus.READY, last_month)
    assert dispatch_scheduled_builds() == 1
    assert len(versions(list_id)) == 2


def test_ready_failed_and_active_builds_this_month_are_skipped(signed_in, redis) -> None:
    now = utcnow()
    ready, failed, queued = create(signed_in), create(signed_in), create(signed_in)
    add_version(ready, VersionStatus.READY, now)
    add_version(failed, VersionStatus.FAILED, now)
    add_version(queued, VersionStatus.QUEUED, None)
    assert dispatch_scheduled_builds() == 0


def test_a_build_requested_meanwhile_is_not_counted(signed_in, redis, monkeypatch) -> None:
    create(signed_in)

    def busy(_session, _shelf):
        raise build_module.BuildInProgressError

    monkeypatch.setattr(build_module, "enqueue_build", busy)
    assert dispatch_scheduled_builds() == 0


def test_a_list_deleted_meanwhile_is_skipped(signed_in, redis, monkeypatch) -> None:
    list_id = create(signed_in)
    original = SessionLocal.session_factory.class_.get

    def gone(self, entity, ident, **kw):
        return None if ident == list_id else original(self, entity, ident, **kw)

    monkeypatch.setattr(SessionLocal.session_factory.class_, "get", gone)
    assert dispatch_scheduled_builds() == 0


def test_scheduler_runs_the_dispatcher_and_cleanup_hourly(redis) -> None:
    jobs = make_scheduler(redis).get_jobs()
    assert [j.func for j in jobs] == [schedule.dispatch_scheduled_builds, delete_expired_exports]
    assert {j.interval for j in jobs} == {3600}
    assert {j.queue_name for j in jobs} == {"default"}
