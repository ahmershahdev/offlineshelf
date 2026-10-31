import hmac
import secrets

from flask import Flask, abort, request, session

from app.config import Settings

UNSAFE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})
HEADER = "X-CSRF-Token"


def get_or_create_token() -> str:
    token = session.get("csrf")
    if not isinstance(token, str):
        token = secrets.token_urlsafe(32)
        session["csrf"] = token
    return token


def rotate_token() -> str:
    session.pop("csrf", None)
    return get_or_create_token()


def init_csrf(app: Flask, settings: Settings) -> None:
    """Two layers: the browser must say the request is same-origin (Sec-Fetch-Site / Origin),
    and the request must echo the session's token in a header a cross-site form cannot set."""
    allowed_origin = settings.site_url.rstrip("/")

    @app.before_request
    def check_csrf() -> None:
        if request.method not in UNSAFE_METHODS:
            return

        fetch_site = request.headers.get("Sec-Fetch-Site")
        if fetch_site is not None and fetch_site not in {"same-origin", "none"}:
            abort(403, description="Cross-site request blocked.")
        origin = request.headers.get("Origin")
        if (
            origin is not None
            and origin != allowed_origin
            and origin != request.host_url.rstrip("/")
        ):
            abort(403, description="Cross-site request blocked.")

        expected = session.get("csrf")
        sent = request.headers.get(HEADER, "")
        if not isinstance(expected, str) or not hmac.compare_digest(expected, sent):
            abort(403, description="Missing or invalid CSRF token.")
