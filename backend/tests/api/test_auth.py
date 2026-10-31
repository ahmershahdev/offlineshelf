from sqlalchemy import select

from app.db import SessionLocal
from app.models import User

CREDS = {"email": "Reader@Example.org", "password": "correct horse battery"}


def test_register_logs_in_and_stores_argon2_hash(api) -> None:
    resp = api.send("POST", "/api/v1/auth/register", CREDS)
    assert resp.status_code == 201
    assert resp.get_json()["user"]["email"] == "reader@example.org"

    user = SessionLocal.scalars(select(User)).one()
    assert user.password_hash.startswith("$argon2id$")
    assert CREDS["password"] not in user.password_hash
    assert api.get("/api/v1/auth/me").status_code == 200


def test_register_twice_conflicts(api) -> None:
    api.send("POST", "/api/v1/auth/register", CREDS)
    api.send("POST", "/api/v1/auth/logout")
    assert api.send("POST", "/api/v1/auth/register", CREDS).status_code == 409


def test_short_password_rejected_without_echoing_it(api) -> None:
    secret = "tiny-pw"
    resp = api.send("POST", "/api/v1/auth/register", {"email": "a@example.org", "password": secret})
    assert resp.status_code == 422
    assert secret not in resp.get_data(as_text=True)


def test_unknown_fields_rejected(api) -> None:
    resp = api.send("POST", "/api/v1/auth/register", {**CREDS, "is_admin": True})
    assert resp.status_code == 422


def test_login_wrong_password_and_unknown_email_look_the_same(api) -> None:
    api.send("POST", "/api/v1/auth/register", CREDS)
    api.send("POST", "/api/v1/auth/logout")
    wrong = api.send("POST", "/api/v1/auth/login", {**CREDS, "password": "wrong password here"})
    unknown = api.send("POST", "/api/v1/auth/login", {**CREDS, "email": "nobody@example.org"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.get_json() == unknown.get_json()


def test_login_then_logout(api) -> None:
    api.send("POST", "/api/v1/auth/register", CREDS)
    api.send("POST", "/api/v1/auth/logout")
    assert api.get("/api/v1/auth/me").status_code == 401
    assert api.send("POST", "/api/v1/auth/login", CREDS).status_code == 200
    assert api.get("/api/v1/auth/me").status_code == 200


def test_logout_everywhere_kills_other_sessions(app, api) -> None:
    api.send("POST", "/api/v1/auth/register", CREDS)
    other = type(api)(app.test_client())
    other.send("POST", "/api/v1/auth/login", CREDS)
    assert other.get("/api/v1/auth/me").status_code == 200

    assert api.send("POST", "/api/v1/auth/logout-everywhere").status_code == 200
    assert other.get("/api/v1/auth/me").status_code == 401


def test_session_cookie_flags(api) -> None:
    resp = api.send("POST", "/api/v1/auth/register", CREDS)
    cookie = resp.headers["Set-Cookie"]
    assert "HttpOnly" in cookie
    assert "SameSite=Lax" in cookie
