from flask import Blueprint, Response, abort, jsonify
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.util import json_body, require_user
from app.db import SessionLocal
from app.models import User
from app.schemas import Credentials, UserOut
from app.security.csrf import get_or_create_token, rotate_token
from app.security.passwords import hash_password, needs_rehash, verify_password
from app.security.ratelimit import email_key, limit_from, limiter
from app.security.session import log_in, log_out

bp = Blueprint("auth", __name__, url_prefix="/auth")
_auth_limit = limit_from("rate_limit_auth")


def _user_out(user: User) -> dict[str, object]:
    return UserOut(id=user.id, email=user.email).model_dump()


@bp.get("/csrf")
def csrf() -> Response:
    return jsonify(token=get_or_create_token())


@bp.post("/register")
@limiter.limit(_auth_limit)
def register() -> tuple[Response, int]:
    creds = json_body(Credentials)
    user = User(email=creds.email, password_hash=hash_password(creds.password))
    SessionLocal.add(user)
    try:
        SessionLocal.commit()
    except IntegrityError:
        SessionLocal.rollback()
        # This reveals that the address has an account. Hiding it needs email confirmation,
        # which arrives with outgoing mail in M3.
        abort(409, description="An account with this email already exists.")
    token = log_in(user)
    return jsonify(user=_user_out(user), csrf=token), 201


@bp.post("/login")
@limiter.limit(_auth_limit)
@limiter.limit(_auth_limit, key_func=email_key)
def login() -> Response:
    creds = json_body(Credentials)
    user = SessionLocal.scalar(select(User).where(User.email == creds.email))
    if not verify_password(user.password_hash if user else None, creds.password) or user is None:
        abort(401, description="Email or password is wrong.")
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(creds.password)
        SessionLocal.commit()
    token = log_in(user)
    return jsonify(user=_user_out(user), csrf=token)


@bp.post("/logout")
def logout() -> Response:
    log_out()
    return jsonify(csrf=rotate_token())


@bp.post("/logout-everywhere")
def logout_everywhere() -> Response:
    user = require_user()
    user.session_epoch += 1
    SessionLocal.commit()
    log_out()
    return jsonify(csrf=rotate_token())


@bp.get("/me")
def me() -> Response:
    return jsonify(user=_user_out(require_user()))
