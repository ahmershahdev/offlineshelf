import logging

from redis import Redis
from rq.exceptions import NoSuchJobError
from rq.job import Job, JobStatus
from sqlalchemy import select

from app.config import get_settings
from app.db import SessionLocal
from app.models import ExportStatus, ListExport, ListVersion, VersionStatus, utcnow

log = logging.getLogger(__name__)

STALLED_BUILD = (
    "The build stopped before it finished (the worker restarted or timed out). Build again."
)
STALLED_EXPORT = "The export stopped before it finished. Make it again."
GONE = frozenset({JobStatus.FINISHED, JobStatus.FAILED, JobStatus.STOPPED, JobStatus.CANCELED})


def _job_gone(job_id: str, redis: Redis) -> bool:
    try:
        status = Job.fetch(job_id, connection=redis).get_status()
    except NoSuchJobError:
        return True
    return status in GONE


def recover_stalled() -> int:
    """Fail versions and exports whose job died with its worker.

    A worker killed mid-job (restart, deploy, out of memory, the job timeout) never runs the
    code that marks the row failed, so the row would stay "building" and block new builds of
    that list. This compares every active row with its RQ job and fails the orphans.
    """
    redis = Redis.from_url(get_settings().redis_url)
    session = SessionLocal()
    recovered = 0
    try:
        versions = session.scalars(
            select(ListVersion).where(
                ListVersion.status.in_((VersionStatus.QUEUED, VersionStatus.BUILDING))
            )
        ).all()
        for version in versions:
            if _job_gone(f"build-{version.id}", redis):
                version.status = VersionStatus.FAILED
                version.error = STALLED_BUILD
                version.finished_at = utcnow()
                recovered += 1
        exports = session.scalars(
            select(ListExport).where(
                ListExport.status.in_((ExportStatus.QUEUED, ExportStatus.BUILDING))
            )
        ).all()
        for export in exports:
            if _job_gone(f"export-{export.id}", redis):
                export.status = ExportStatus.FAILED
                export.error = STALLED_EXPORT
                export.finished_at = utcnow()
                export.expires_at = utcnow()
                recovered += 1
        session.commit()
        if recovered:
            log.warning("Failed %d stalled builds and exports", recovered)
        return recovered
    finally:
        session.close()
        SessionLocal.remove()
