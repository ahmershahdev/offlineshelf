from datetime import timedelta

from flask import Flask, session
from sqlalchemy import select

from app.config import Settings
from app.db import SessionLocal
from app.models import User
from app.security.csrf import rotate_token


def init_session_cookie(app: Flask, settings: Settings) -> None:
    app.config.update(
        SECRET_KEY=settings.secret_key.get_secret_value(),
        # The __Host- prefix makes the browser refuse the cookie unless it is Secure, has no
        # Domain and has Path=/, so a sibling subdomain can't overwrite it.
        SESSION_COOKIE_NAME="__Host-session" if settings.is_prod else "session",
        SESSION_COOKIE_SECURE=settings.is_prod,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        PERMANENT_SESSION_LIFETIME=timedelta(days=settings.session_days),
    )


def log_in(user: User) -> str:
    # A fresh session on login prevents fixation: nothing set before login survives it.
    session.clear()
    session.permanent = True
    session["uid"] = user.id
    session["epoch"] = user.session_epoch
    return rotate_token()


def log_out() -> None:
    session.clear()


def current_user() -> User | None:
    uid = session.get("uid")
    if not isinstance(uid, int):
        return None
    user = SessionLocal.scalar(select(User).where(User.id == uid))
    if user is None or session.get("epoch") != user.session_epoch:
        session.clear()
        return None
    return user
