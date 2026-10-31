from collections.abc import Callable

from flask import request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from app.config import current_settings

# get_remote_address reads request.remote_addr, which ProxyFix (set up in create_app) rewrites
# from X-Forwarded-For for the configured number of trusted proxies only.
limiter = Limiter(key_func=get_remote_address, headers_enabled=True, strategy="moving-window")


def email_key() -> str:
    """Limits login attempts per account as well as per IP, so one address can't be brute
    forced from many IPs."""
    data = request.get_json(silent=True)
    email = data.get("email") if isinstance(data, dict) else None
    if isinstance(email, str):
        return "email:" + email.strip().lower()[:254]
    return "ip:" + get_remote_address()


def limit_from(name: str) -> Callable[[], str]:
    """Reads the limit when the request comes in, so each app instance uses its own settings."""
    return lambda: str(getattr(current_settings(), name))
