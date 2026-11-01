from pathlib import Path

from flask import Blueprint, Response, abort, jsonify, send_file
from sqlalchemy import select

from app.api.lists import _owned, _owned_version
from app.api.util import json_body, require_user
from app.config import current_settings
from app.db import SessionLocal
from app.jobs.export import enqueue_export, exports_dir
from app.models import ExportStatus, ListExport, ListVersion, VersionStatus, utcnow
from app.schemas import ExportCreate, ExportOut
from app.security.ratelimit import limit_from, limiter

bp = Blueprint("exports", __name__, url_prefix="/lists")
RECENT_EXPORTS = 10


def _out(export: ListExport) -> dict[str, object]:
    out = ExportOut.model_validate(
        {
            **{c: getattr(export, c) for c in ExportOut.model_fields if c != "total"},
            "total": export.version.article_count,
        }
    )
    return out.model_dump(mode="json")


@bp.post("/<int:list_id>/versions/<int:version_id>/exports")
@limiter.limit(limit_from("rate_limit_build"))
def create(list_id: int, version_id: int) -> tuple[Response, int]:
    version = _owned_version(list_id, version_id)
    data = json_body(ExportCreate)
    if version.status is not VersionStatus.READY:
        abort(409, description="Only a ready version can be exported.")
    cap = current_settings().max_bundle_articles
    if version.article_count > cap:
        abort(
            422,
            description=f"HTML bundles hold up to {cap:,} articles. Use the TSV export instead.",
        )
    export = enqueue_export(SessionLocal(), version, data.format)
    return jsonify(_out(export)), 202


@bp.get("/<int:list_id>/versions/<int:version_id>/exports")
def index(list_id: int, version_id: int) -> Response:
    version = _owned_version(list_id, version_id)
    rows = SessionLocal.scalars(
        select(ListExport)
        .where(ListExport.version_id == version.id)
        .order_by(ListExport.id.desc())
        .limit(RECENT_EXPORTS)
    )
    return jsonify({"items": [_out(e) for e in rows]})


@bp.get("/<int:list_id>/exports/<int:export_id>/download")
def download(list_id: int, export_id: int) -> Response:
    shelf = _owned(list_id, require_user())
    export = SessionLocal.scalar(
        select(ListExport)
        .join(ListVersion, ListExport.version_id == ListVersion.id)
        .where(ListExport.id == export_id, ListVersion.list_id == shelf.id)
    )
    if export is None or export.status is not ExportStatus.READY or not export.file_name:
        abort(404, description="No such export.")
    path = exports_dir(current_settings()) / export.file_name
    if (export.expires_at and export.expires_at < utcnow()) or not path.is_file():
        abort(410, description="This export has expired. Make a new one.")
    return send_file(
        Path(path).resolve(),
        mimetype="application/zip",
        as_attachment=True,
        download_name=f"offlineshelf-{shelf.id}-v{export.version_id}.zip",
        max_age=0,
    )
