import os
from collections.abc import Iterator

import pytest
from alembic import command
from alembic.config import Config
from flask import Flask
from flask.testing import FlaskClient
from redis import Redis
from sqlalchemy import text

# Forced, not defaulted: a developer's shell may have .env loaded, and tests must never run
# against the dev database or with dev settings.
os.environ["OFFLINESHELF_ENV"] = "test"
os.environ["OFFLINESHELF_SECRET_KEY"] = "test-secret-key-that-is-long-enough-1234567890"
os.environ["OFFLINESHELF_SITE_URL"] = "http://localhost"
os.environ["OFFLINESHELF_TRUSTED_PROXIES"] = "0"
os.environ["OFFLINESHELF_DATABASE_URL"] = os.environ.get(
    "OFFLINESHELF_TEST_DATABASE_URL",
    "mariadb+pymysql://offlineshelf:offlineshelf@127.0.0.1:3306/offlineshelf_test",
)
os.environ["OFFLINESHELF_REDIS_URL"] = os.environ.get(
    "OFFLINESHELF_TEST_REDIS_URL", "redis://127.0.0.1:6379/15"
)

from app import create_app
from app.config import get_settings
from app.db import SessionLocal

TABLES = ("list_article", "list_version", "shelf_list", "user")


@pytest.fixture(scope="session")
def app() -> Iterator[Flask]:
    settings = get_settings()
    cfg = Config("alembic.ini")
    cfg.attributes["database_url"] = settings.database_url
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    application = create_app(settings)
    application.config["TESTING"] = True
    yield application
    application.extensions["engine"].dispose()


@pytest.fixture(autouse=True)
def _clean(app: Flask) -> Iterator[None]:
    yield
    SessionLocal.remove()
    with app.extensions["engine"].begin() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        for table in TABLES:
            conn.execute(text(f"TRUNCATE TABLE `{table}`"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))


@pytest.fixture
def redis() -> Iterator[Redis]:
    conn = Redis.from_url(get_settings().redis_url)
    conn.flushdb()
    yield conn
    conn.flushdb()


class ApiClient:
    def __init__(self, client: FlaskClient) -> None:
        self.client = client
        self.token = ""

    def refresh_csrf(self) -> None:
        self.token = self.client.get("/api/v1/auth/csrf").get_json()["token"]

    def get(self, url: str, **kw: object):  # type: ignore[no-untyped-def]
        return self.client.get(url, **kw)  # type: ignore[arg-type]

    def send(self, method: str, url: str, json: object | None = None, **kw: object):  # type: ignore[no-untyped-def]
        if not self.token:
            self.refresh_csrf()
        headers = {"X-CSRF-Token": self.token, **kw.pop("headers", {})}  # type: ignore[dict-item]
        resp = self.client.open(url, method=method, json=json, headers=headers, **kw)  # type: ignore[arg-type]
        body = resp.get_json(silent=True)
        if isinstance(body, dict) and "csrf" in body:
            self.token = body["csrf"]
        return resp


@pytest.fixture
def api(app: Flask) -> ApiClient:
    return ApiClient(app.test_client())


@pytest.fixture
def signed_in(api: ApiClient) -> ApiClient:
    resp = api.send(
        "POST",
        "/api/v1/auth/register",
        {"email": "reader@example.org", "password": "correct horse battery"},
    )
    assert resp.status_code == 201
    return api
