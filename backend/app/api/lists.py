from flask import Blueprint, Response, abort, jsonify, request
from sqlalchemy import func, select

from app.api.util import json_body, require_user
from app.config import current_settings
from app.db import SessionLocal
from app.jobs.build import BuildInProgressError, enqueue_build
from app.models import ListArticle, ListVersion, ShelfList, User, VersionStatus
from app.schemas import (
    ArticleOut,
    ArticlePage,
    ListCreate,
    ListOut,
    ListPage,
    VersionOut,
    VersionPage,
)
from app.security.ratelimit import limit_from, limiter

bp = Blueprint("lists", __name__, url_prefix="/lists")
PAGE_SIZE_MAX = 100


def _latest_statuses(list_ids: list[int]) -> dict[int, VersionStatus]:
    if not list_ids:
        return {}
    latest = (
        select(func.max(ListVersion.id).label("vid"))
        .where(ListVersion.list_id.in_(list_ids))
        .group_by(ListVersion.list_id)
        .subquery()
    )
    rows = SessionLocal.execute(
        select(ListVersion.list_id, ListVersion.status).join(latest, ListVersion.id == latest.c.vid)
    )
    return {row[0]: row[1] for row in rows}


def _out(shelf: ShelfList) -> dict[str, object]:
    out = ListOut.model_validate(shelf)
    out.latest_status = _latest_statuses([shelf.id]).get(shelf.id)
    return out.model_dump(mode="json")


def _owned(list_id: int, user: User) -> ShelfList:
    shelf = SessionLocal.scalar(
        select(ShelfList).where(ShelfList.id == list_id, ShelfList.owner_id == user.id)
    )
    if shelf is None:
        # 404 for someone else's list too, so IDs can't be probed for existence.
        abort(404, description="No such list.")
    return shelf


def _page_args(default: int = 20, maximum: int = PAGE_SIZE_MAX) -> tuple[int, int | None]:
    limit = request.args.get("limit", default=default, type=int) or default
    return max(1, min(limit, maximum)), request.args.get("cursor", type=int)


@bp.get("")
def index() -> Response:
    user = require_user()
    limit, cursor = _page_args()

    query = select(ShelfList).where(ShelfList.owner_id == user.id)
    if cursor is not None:
        query = query.where(ShelfList.id < cursor)
    rows = list(SessionLocal.scalars(query.order_by(ShelfList.id.desc()).limit(limit + 1)))
    has_more = len(rows) > limit
    rows = rows[:limit]
    statuses = _latest_statuses([r.id for r in rows])
    items = []
    for r in rows:
        item = ListOut.model_validate(r)
        item.latest_status = statuses.get(r.id)
        items.append(item)
    page = ListPage(
        items=items,
        next_cursor=rows[-1].id if has_more else None,
    )
    return jsonify(page.model_dump(mode="json"))


@bp.post("")
@limiter.limit(limit_from("rate_limit_write"))
def create() -> tuple[Response, int]:
    user = require_user()
    data = json_body(ListCreate)

    # Lock the owner's row so two concurrent requests can't both pass the count check.
    SessionLocal.scalar(select(User.id).where(User.id == user.id).with_for_update())
    count = SessionLocal.scalar(
        select(func.count()).select_from(ShelfList).where(ShelfList.owner_id == user.id)
    )
    if (count or 0) >= current_settings().max_lists_per_user:
        SessionLocal.rollback()
        abort(422, description="You have reached the maximum number of lists.")

    shelf = ShelfList(
        owner_id=user.id,
        name=data.name,
        wiki=data.wiki,
        builder=data.params.kind,
        params=data.params.model_dump(mode="json", exclude={"kind"}),
        schedule=data.schedule,
    )
    SessionLocal.add(shelf)
    SessionLocal.commit()
    response = jsonify(_out(shelf))
    response.headers["Location"] = f"/api/v1/lists/{shelf.id}"
    return response, 201


@bp.get("/<int:list_id>")
def show(list_id: int) -> Response:
    return jsonify(_out(_owned(list_id, require_user())))


@bp.delete("/<int:list_id>")
@limiter.limit(limit_from("rate_limit_write"))
def delete(list_id: int) -> tuple[str, int]:
    shelf = _owned(list_id, require_user())
    SessionLocal.delete(shelf)
    SessionLocal.commit()
    return "", 204


@bp.post("/<int:list_id>/build")
@limiter.limit(limit_from("rate_limit_build"))
def build(list_id: int) -> tuple[Response, int]:
    shelf = _owned(list_id, require_user())
    try:
        version = enqueue_build(SessionLocal(), shelf)
    except BuildInProgressError:
        abort(409, description="A build for this list is already queued or running.")
    response = jsonify(VersionOut.model_validate(version).model_dump(mode="json"))
    response.headers["Location"] = f"/api/v1/lists/{list_id}/versions/{version.id}"
    return response, 202


@bp.get("/<int:list_id>/versions")
def versions(list_id: int) -> Response:
    shelf = _owned(list_id, require_user())
    limit, cursor = _page_args()
    query = select(ListVersion).where(ListVersion.list_id == shelf.id)
    if cursor is not None:
        query = query.where(ListVersion.id < cursor)
    rows = list(SessionLocal.scalars(query.order_by(ListVersion.id.desc()).limit(limit + 1)))
    page = VersionPage(
        items=[VersionOut.model_validate(v) for v in rows[:limit]],
        next_cursor=rows[limit - 1].id if len(rows) > limit else None,
    )
    return jsonify(page.model_dump(mode="json"))


def _owned_version(list_id: int, version_id: int) -> ListVersion:
    shelf = _owned(list_id, require_user())
    version = SessionLocal.scalar(
        select(ListVersion).where(ListVersion.id == version_id, ListVersion.list_id == shelf.id)
    )
    if version is None:
        abort(404, description="No such version.")
    return version


@bp.get("/<int:list_id>/versions/<int:version_id>")
def version(list_id: int, version_id: int) -> Response:
    found = _owned_version(list_id, version_id)
    return jsonify(VersionOut.model_validate(found).model_dump(mode="json"))


@bp.get("/<int:list_id>/versions/<int:version_id>/articles")
def articles(list_id: int, version_id: int) -> Response:
    found = _owned_version(list_id, version_id)
    limit, cursor = _page_args(default=100, maximum=1000)
    query = select(ListArticle).where(ListArticle.version_id == found.id)
    if cursor is not None:
        query = query.where(ListArticle.id > cursor)
    rows = list(SessionLocal.scalars(query.order_by(ListArticle.id).limit(limit + 1)))
    page = ArticlePage(
        items=[ArticleOut.model_validate(a) for a in rows[:limit]],
        next_cursor=rows[limit - 1].id if len(rows) > limit else None,
    )
    return jsonify(page.model_dump(mode="json"))
