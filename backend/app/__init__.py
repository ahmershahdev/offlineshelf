import logging
import uuid

from flask import Flask, Response, g, request
from redis import Redis
from werkzeug.middleware.proxy_fix import ProxyFix

from app.api import register_blueprints
from app.api.errors import init_errors
from app.config import Settings, get_settings
from app.db import SessionLocal, bind_session, make_engine
from app.security.csrf import init_csrf
from app.security.headers import init_security_headers
from app.security.ratelimit import limiter
from app.security.session import init_session_cookie


def create_app(settings: Settings | None = None) -> Flask:
    settings = settings or get_settings()
    app = Flask(__name__)  # NOSONAR: CSRF is enforced by app/security/csrf.py, not Flask-WTF
    app.config["MAX_CONTENT_LENGTH"] = settings.max_request_bytes
    app.json.sort_keys = False  # type: ignore[attr-defined]

    if settings.trusted_proxies:
        n = settings.trusted_proxies
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=n, x_proto=n, x_host=n)  # type: ignore[method-assign]

    engine = make_engine(settings)
    bind_session(engine)
    app.extensions["settings"] = settings
    app.extensions["engine"] = engine
    app.extensions["redis"] = Redis.from_url(settings.redis_url, socket_timeout=2)

    app.config["RATELIMIT_STORAGE_URI"] = settings.redis_url
    app.config["RATELIMIT_DEFAULT"] = settings.rate_limit_default
    app.config["RATELIMIT_KEY_PREFIX"] = "offlineshelf"
    app.config["RATELIMIT_ENABLED"] = settings.env != "test"
    limiter.init_app(app)

    init_session_cookie(app, settings)
    init_csrf(app, settings)
    init_security_headers(app, settings)
    init_errors(app)
    _init_request_id(app)
    register_blueprints(app)

    @app.teardown_appcontext
    def remove_session(_: BaseException | None) -> None:
        SessionLocal.remove()

    return app


def _init_request_id(app: Flask) -> None:
    log = logging.getLogger("offlineshelf.request")

    @app.before_request
    def assign() -> None:
        incoming = request.headers.get("X-Request-ID", "")
        # Accept the proxy's ID only if it looks like one; anything else could inject into logs.
        ok = 8 <= len(incoming) <= 64 and incoming.replace("-", "").isalnum()
        g.request_id = incoming if ok else uuid.uuid4().hex

    @app.after_request
    def echo(response: Response) -> Response:
        response.headers["X-Request-ID"] = g.get("request_id", "")
        log.info(
            "%s %s %s",
            request.method,
            request.path,
            response.status_code,
            extra={"request_id": g.get("request_id")},
        )
        return response
