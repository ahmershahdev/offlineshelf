from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="OFFLINESHELF_", extra="ignore")

    env: Literal["dev", "test", "prod"] = "dev"
    secret_key: SecretStr = Field(min_length=32)
    database_url: str
    redis_url: str = "redis://localhost:6379/0"
    site_url: str = "https://offlineshelf.ahmershah.dev"

    # Number of reverse proxies in front of the API. Each one appends to X-Forwarded-For; trusting
    # more hops than exist lets a client choose the IP the rate limiter sees.
    trusted_proxies: int = Field(default=0, ge=0, le=3)

    max_request_bytes: int = 1_000_000
    session_days: int = 14
    db_pool_size: int = 10
    db_max_overflow: int = 5

    rate_limit_default: str = "300 per minute;5000 per hour"
    rate_limit_auth: str = "10 per minute;50 per hour"
    rate_limit_write: str = "30 per minute"
    rate_limit_build: str = "20 per hour"

    max_lists_per_user: int = 100
    max_articles_per_list: int = 100_000
    max_category_depth: int = 5
    max_pasted_titles: int = 20_000
    max_sparql_chars: int = 10_000
    max_top_articles: int = 1000
    sparql_timeout_seconds: int = 60

    exports_dir: str = "/data/exports"
    max_bundle_articles: int = 1000
    export_days: int = 7

    # An empty host turns email off; failures are then only visible in the app.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: SecretStr = SecretStr("")
    # Removed (mail is always encrypted); read only so installs that still set it get a warning.
    smtp_starttls: bool | None = None
    mail_from: str = "OfflineShelf <noreply@ahmershah.dev>"

    @field_validator("database_url")
    @classmethod
    def require_mariadb(cls, value: str) -> str:
        if not value.startswith("mariadb+pymysql://"):
            raise ValueError("database_url must use the mariadb+pymysql:// driver")
        return value

    @property
    def is_prod(self) -> bool:
        return self.env == "prod"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def current_settings() -> Settings:
    from flask import current_app, has_app_context

    if has_app_context():
        settings: Settings = current_app.extensions["settings"]
        return settings
    return get_settings()
