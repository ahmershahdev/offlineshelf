from rq.job import Job

from app.db import SessionLocal
from app.jobs.queue import get_queue
from app.jobs.recover import STALLED_BUILD, STALLED_EXPORT, recover_stalled
from app.models import ExportStatus, ListExport, ListVersion, VersionStatus
from tests.jobs.test_build import create_list


def noop() -> None:
    return None


def add_version(list_id: int, status: VersionStatus) -> int:
    v = ListVersion(list_id=list_id, status=status)
    SessionLocal.add(v)
    SessionLocal.commit()
    return v.id


def get(model, row_id):
    SessionLocal.expire_all()
    return SessionLocal.get_one(model, row_id)


def test_orphaned_rows_are_failed_and_live_ones_kept(signed_in, redis) -> None:
    list_id = create_list(signed_in)
    orphan = add_version(list_id, VersionStatus.BUILDING)
    alive = add_version(list_id, VersionStatus.QUEUED)
    dead = add_version(list_id, VersionStatus.QUEUED)
    done = add_version(list_id, VersionStatus.READY)
    queue = get_queue(connection=redis)
    queue.enqueue(noop, job_id=f"build-{alive}")
    failed_job = queue.enqueue(noop, job_id=f"build-{dead}")
    failed_job.set_status("failed")

    export = ListExport(version_id=done, format="html", status=ExportStatus.BUILDING)
    SessionLocal.add(export)
    SessionLocal.commit()

    assert recover_stalled() == 3
    assert get(ListVersion, orphan).status is VersionStatus.FAILED
    assert get(ListVersion, orphan).error == STALLED_BUILD
    assert get(ListVersion, dead).status is VersionStatus.FAILED
    assert get(ListVersion, alive).status is VersionStatus.QUEUED
    assert get(ListVersion, done).status is VersionStatus.READY
    stalled = get(ListExport, export.id)
    assert stalled.status is ExportStatus.FAILED
    assert stalled.error == STALLED_EXPORT
    assert stalled.expires_at is not None
    assert Job.fetch(f"build-{alive}", connection=redis).get_status() == "queued"


def test_nothing_to_recover(app, redis) -> None:
    assert recover_stalled() == 0
