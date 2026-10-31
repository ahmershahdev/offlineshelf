from flask import Blueprint, Response, current_app, jsonify
from redis import Redis
from sqlalchemy import text

from app.db import SessionLocal
from app.security.ratelimit import limiter

bp = Blueprint("health", __name__)


@bp.get("/health")
@limiter.exempt
def health() -> tuple[Response, int]:
    checks: dict[str, str] = {}
    try:
        SessionLocal.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "down"
    try:
        redis: Redis = current_app.extensions["redis"]
        redis.ping()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "down"
    healthy = all(v == "ok" for v in checks.values())
    return jsonify(status="ok" if healthy else "degraded", checks=checks), 200 if healthy else 503
