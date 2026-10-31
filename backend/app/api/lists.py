from flask import Blueprint, Response, abort, jsonify, request
from sqlalchemy import func, select

from app.api.util import json_body, require_user
from app.config import current_settings
from app.db import SessionLocal
from app.models import ListVersion, ShelfList, User, VersionStatus
from app.schemas import ListCreate, ListOut, ListPage
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


@bp.get("")
def index() -> Response:
    user = require_user()
    limit = request.args.get("limit", default=20, type=int) or 20
    limit = max(1, min(limit, PAGE_SIZE_MAX))
    cursor = request.args.get("cursor", type=int)

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
