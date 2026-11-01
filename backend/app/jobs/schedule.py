import logging
from datetime import datetime

from sqlalchemy import exists, or_, select

from app.db import SessionLocal
from app.jobs import build
from app.models import ListVersion, Schedule, ShelfList, utcnow

log = logging.getLogger(__name__)

DISPATCH_INTERVAL_SECONDS = 3600


def month_start(now: datetime) -> datetime:
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def dispatch_scheduled_builds() -> int:
    """Queue a build for every monthly list that has not been built this month (UTC).

    Safe to run as often as needed: a list with a build queued, running or started this month is
    skipped, so a missed or repeated run neither skips a month nor builds twice.
    """
    session = SessionLocal()
    try:
        since = month_start(utcnow())
        # A build that failed this month counts: the owner was emailed and can rebuild by hand,
        # and retrying every hour would hammer Wikimedia with a query that keeps failing.
        built = exists().where(
            ListVersion.list_id == ShelfList.id,
            or_(ListVersion.status.in_(build.ACTIVE), ListVersion.started_at >= since),
        )
        due = session.scalars(
            select(ShelfList.id)
            .where(ShelfList.schedule == Schedule.MONTHLY, ~built)
            .order_by(ShelfList.id)
        ).all()
        queued = 0
        for list_id in due:
            shelf = session.get(ShelfList, list_id)
            if shelf is None:
                continue
            try:
                build.enqueue_build(session, shelf)
            except build.BuildInProgressError:
                continue
            queued += 1
        log.info("Queued %d scheduled builds", queued)
        return queued
    finally:
        session.close()
        SessionLocal.remove()
