import logging
from collections.abc import Iterable, Iterator
from importlib import import_module
from itertools import islice

from rq import Retry, get_current_job
from sqlalchemy import delete, insert, select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.contract import Builder, Limits, Page, WikiSource
from app.db import SessionLocal
from app.jobs.queue import BUILD_TIMEOUT_SECONDS, get_queue
from app.models import BuilderKind, ListArticle, ListVersion, ShelfList, VersionStatus, utcnow
from app.wiki.client import WikiApiError, WikiClient, WikiNetworkError
from app.wiki.source import HttpWikiSource

log = logging.getLogger(__name__)

INSERT_BATCH = 1000
ACTIVE = (VersionStatus.QUEUED, VersionStatus.BUILDING)
NETWORK_RETRY = Retry(max=3, interval=[60, 300, 900])


class BuildInProgressError(Exception):
    pass


class BuilderNotImplementedError(Exception):
    pass


class TooManyArticlesError(Exception):
    pass


def resolve_builder(kind: BuilderKind) -> Builder:
    # Builders live in app/core, which the maintainer writes (AGENTS.md). Until a builder exists
    # its builds fail with a clear message instead of crashing the worker.
    try:
        registry = import_module("app.core.builders").REGISTRY
        builder: Builder = registry[kind]
    except (ImportError, AttributeError, KeyError) as exc:
        raise BuilderNotImplementedError(
            f"The {kind.value} builder is not implemented yet."
        ) from exc
    return builder


def make_source(wiki: str, settings: Settings) -> WikiSource:
    return HttpWikiSource(WikiClient(), wiki, sparql_timeout=settings.sparql_timeout_seconds)


def enqueue_build(session: Session, shelf: ShelfList) -> ListVersion:
    # The row lock serialises two build requests for the same list, so only one can find no
    # active version and create one.
    session.scalar(select(ShelfList.id).where(ShelfList.id == shelf.id).with_for_update())
    active = session.scalar(
        select(ListVersion.id).where(
            ListVersion.list_id == shelf.id, ListVersion.status.in_(ACTIVE)
        )
    )
    if active is not None:
        session.rollback()
        raise BuildInProgressError
    version = ListVersion(list_id=shelf.id, status=VersionStatus.QUEUED)
    session.add(version)
    session.commit()
    get_queue().enqueue(
        run_build,
        version.id,
        job_id=f"build-{version.id}",
        retry=NETWORK_RETRY,
        job_timeout=BUILD_TIMEOUT_SECONDS,
        failure_ttl=7 * 24 * 3600,
    )
    return version


def run_build(version_id: int) -> None:
    settings = get_settings()
    session = SessionLocal()
    try:
        version = session.get(ListVersion, version_id)
        if version is None or version.status not in ACTIVE:
            return
        shelf = version.shelf_list
        version.status = VersionStatus.BUILDING
        version.started_at = utcnow()
        version.error = None
        session.commit()

        try:
            limits = Limits(
                max_articles=settings.max_articles_per_list,
                max_category_depth=settings.max_category_depth,
            )
            builder = resolve_builder(shelf.builder)
            result = builder(make_source(shelf.wiki, settings), shelf.params, limits)
            count = _write_articles(session, version_id, result.articles, limits.max_articles)
        except WikiNetworkError as exc:
            session.rollback()
            job = get_current_job()
            if job is not None and job.retries_left:
                _mark(session, version_id, VersionStatus.QUEUED, f"Retrying: {exc}")
                raise
            _mark(session, version_id, VersionStatus.FAILED, str(exc))
            return
        except (WikiApiError, BuilderNotImplementedError, TooManyArticlesError) as exc:
            session.rollback()
            _mark(session, version_id, VersionStatus.FAILED, str(exc))
            return
        except Exception:
            session.rollback()
            log.exception("Build %s crashed", version_id)
            _mark(session, version_id, VersionStatus.FAILED, "The build failed unexpectedly.")
            return

        version = session.get_one(ListVersion, version_id)
        version.status = VersionStatus.READY
        version.finished_at = utcnow()
        version.article_count = count
        version.report = result.report or None
        session.commit()
    finally:
        session.close()
        SessionLocal.remove()


def _write_articles(
    session: Session, version_id: int, articles: Iterable[Page], max_articles: int
) -> int:
    # One transaction for the whole list: a reader never sees half a version, and a failure
    # rolls everything back. Batches keep memory flat for very large lists.
    session.execute(delete(ListArticle).where(ListArticle.version_id == version_id))
    count = 0
    for batch in _batched(iter(articles), INSERT_BATCH):
        count += len(batch)
        if count > max_articles:
            raise TooManyArticlesError(f"The list has more than {max_articles:,} articles.")
        session.execute(
            insert(ListArticle),
            [
                {
                    "version_id": version_id,
                    "page_id": p.page_id,
                    "title": p.title,
                    "revision_id": p.revision_id,
                }
                for p in batch
            ],
        )
    return count


def _mark(session: Session, version_id: int, status: VersionStatus, error: str) -> None:
    version = session.get_one(ListVersion, version_id)
    version.status = status
    version.error = error[:1000]
    if status is VersionStatus.FAILED:
        version.finished_at = utcnow()
    session.commit()


def _batched(items: Iterator[Page], size: int) -> Iterator[list[Page]]:
    while batch := list(islice(items, size)):
        yield batch
