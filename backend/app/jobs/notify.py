from datetime import timedelta

from rq import Retry
from sqlalchemy import select

from app.config import get_settings
from app.db import SessionLocal
from app.jobs.queue import get_queue
from app.mail import send_email
from app.models import ListVersion, ShelfList, VersionStatus, utcnow

FAILURE_EMAIL_INTERVAL = timedelta(days=1)


def enqueue_failure_email(version_id: int) -> None:
    get_queue().enqueue(
        send_failure_email,
        version_id,
        job_id=f"failure-email-{version_id}",
        retry=Retry(max=3, interval=[60, 300, 900]),
    )


def send_failure_email(version_id: int) -> None:
    settings = get_settings()
    session = SessionLocal()
    try:
        version = session.get(ListVersion, version_id)
        if version is None or version.status is not VersionStatus.FAILED or version.notified_at:
            return
        # Locking the list row makes two failures finishing at the same moment send one email.
        # The timestamp lives on the version because writing to shelf_list would bump its
        # row_version and turn the owner's next edit into a false conflict.
        shelf = session.scalars(
            select(ShelfList).where(ShelfList.id == version.list_id).with_for_update()
        ).one()
        now = utcnow()
        recent = session.scalar(
            select(ListVersion.id).where(
                ListVersion.list_id == shelf.id,
                ListVersion.notified_at > now - FAILURE_EMAIL_INTERVAL,
            )
        )
        if recent is not None:
            return
        subject = f"Build failed: {' '.join(shelf.name.split())}"
        body = (
            f'The latest build of your list "{shelf.name}" on {shelf.wiki} failed.\n\n'
            f"Reason: {version.error or 'unknown'}\n\n"
            "The last good version of the list is unchanged. Open the list to try again:\n"
            f"{settings.site_url}/app\n\n"
            "You get at most one of these emails per list per day.\n"
        )
        if send_email(settings, shelf.owner.email, subject, body):
            version.notified_at = now
        # Commit only after a successful send: if SMTP fails the job raises, the lock is
        # released on rollback, and RQ retries it.
        session.commit()
    finally:
        session.close()
        SessionLocal.remove()
