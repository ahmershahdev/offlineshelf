import logging
import time
from datetime import timedelta
from pathlib import Path

from rq import get_current_job
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.bundle import BundleArticle, write_bundle
from app.config import Settings, get_settings
from app.db import SessionLocal
from app.jobs.build import NETWORK_RETRY
from app.jobs.queue import get_queue
from app.models import ExportStatus, ListArticle, ListExport, ListVersion, utcnow
from app.wiki.client import WikiApiError, WikiClient, WikiNetworkError, WikiNotFoundError

log = logging.getLogger(__name__)

EXPORT_TIMEOUT_SECONDS = 2 * 3600
PROGRESS_EVERY = 25
LIVE = (ExportStatus.QUEUED, ExportStatus.BUILDING, ExportStatus.READY)


def exports_dir(settings: Settings) -> Path:
    return Path(settings.exports_dir)


def enqueue_export(session: Session, version: ListVersion, fmt: str = "html") -> ListExport:
    """Queue an export, or return the one already queued, running or ready for this version."""
    session.scalar(select(ListVersion.id).where(ListVersion.id == version.id).with_for_update())
    existing = session.scalar(
        select(ListExport)
        .where(
            ListExport.version_id == version.id,
            ListExport.format == fmt,
            ListExport.status.in_(LIVE),
            or_(ListExport.expires_at.is_(None), ListExport.expires_at > utcnow()),
        )
        .order_by(ListExport.id.desc())
    )
    if existing is not None:
        session.commit()
        return existing
    export = ListExport(version_id=version.id, format=fmt, status=ExportStatus.QUEUED)
    session.add(export)
    session.commit()
    get_queue().enqueue(
        run_export,
        export.id,
        job_id=f"export-{export.id}",
        retry=NETWORK_RETRY,
        job_timeout=EXPORT_TIMEOUT_SECONDS,
        failure_ttl=7 * 24 * 3600,
    )
    return export


def make_client() -> WikiClient:
    return WikiClient()


def run_export(export_id: int) -> None:
    settings = get_settings()
    session = SessionLocal()
    client: WikiClient | None = None
    part: Path | None = None
    try:
        export = session.get(ListExport, export_id)
        if export is None or export.status not in (ExportStatus.QUEUED, ExportStatus.BUILDING):
            return
        version = export.version
        shelf = version.shelf_list
        export.status = ExportStatus.BUILDING
        export.progress = 0
        export.error = None
        session.commit()

        articles = [
            BundleArticle(page_id=r.page_id, title=r.title, revision_id=r.revision_id)
            for r in session.execute(
                select(ListArticle.page_id, ListArticle.title, ListArticle.revision_id)
                .where(ListArticle.version_id == version.id)
                .order_by(ListArticle.id)
            )
        ]
        directory = exports_dir(settings)
        directory.mkdir(parents=True, exist_ok=True)
        final = directory / f"export-{export_id}.zip"
        part = directory / f"export-{export_id}.zip.part"
        wiki_client = client = make_client()

        def fetch(article: BundleArticle) -> str | None:
            try:
                return wiki_client.page_html(shelf.wiki, article.title, article.revision_id)
            except WikiNotFoundError:
                return None

        def progress(done: int) -> None:
            if done % PROGRESS_EVERY == 0:
                session.get_one(ListExport, export_id).progress = done
                session.commit()

        try:
            result = write_bundle(
                part,
                name=shelf.name,
                wiki=shelf.wiki,
                built=version.finished_at,
                site_url=settings.site_url,
                articles=articles,
                fetch=fetch,
                on_progress=progress,
            )
            part.replace(final)
        except WikiNetworkError as exc:
            session.rollback()
            job = get_current_job()
            if job is not None and job.retries_left:
                _mark(session, export_id, ExportStatus.QUEUED, f"Retrying: {exc}", settings)
                raise
            _mark(session, export_id, ExportStatus.FAILED, str(exc), settings)
            return
        except (WikiApiError, OSError) as exc:
            session.rollback()
            _mark(session, export_id, ExportStatus.FAILED, str(exc), settings)
            return
        except Exception:
            session.rollback()
            log.exception("Export %s crashed", export_id)
            _mark(
                session, export_id, ExportStatus.FAILED, "The export failed unexpectedly.", settings
            )
            return

        export = session.get_one(ListExport, export_id)
        now = utcnow()
        export.status = ExportStatus.READY
        export.file_name = final.name
        export.size_bytes = final.stat().st_size
        export.progress = len(articles)
        export.missing = result.missing or None
        export.finished_at = now
        export.expires_at = now + timedelta(days=settings.export_days)
        session.commit()
    finally:
        if part is not None:
            part.unlink(missing_ok=True)
        if client is not None:
            client.close()
        session.close()
        SessionLocal.remove()


def _mark(
    session: Session, export_id: int, status: ExportStatus, error: str, settings: Settings
) -> None:
    export = session.get_one(ListExport, export_id)
    export.status = status
    export.error = error[:1000]
    if status is ExportStatus.FAILED:
        now = utcnow()
        export.finished_at = now
        # Failed rows expire too, so the cleanup job removes them.
        export.expires_at = now + timedelta(days=settings.export_days)
    session.commit()


def remove_files(settings: Settings, names: list[str]) -> None:
    for name in names:
        (exports_dir(settings) / name).unlink(missing_ok=True)


def delete_expired_exports() -> int:
    settings = get_settings()
    session = SessionLocal()
    try:
        expired = list(session.scalars(select(ListExport).where(ListExport.expires_at < utcnow())))
        remove_files(settings, [e.file_name for e in expired if e.file_name])
        for export in expired:
            session.delete(export)
        session.commit()
        # Files left behind by a crash or a deleted row are removed once they are as old as an
        # export can get.
        cutoff = time.time() - settings.export_days * 86400
        directory = exports_dir(settings)
        if directory.is_dir():
            for path in directory.glob("export-*"):
                if path.stat().st_mtime < cutoff:
                    path.unlink(missing_ok=True)
        log.info("Deleted %d expired exports", len(expired))
        return len(expired)
    finally:
        session.close()
        SessionLocal.remove()
