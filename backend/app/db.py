from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, scoped_session, sessionmaker

from app.config import Settings


class Base(DeclarativeBase):
    pass


SessionLocal: scoped_session[Session] = scoped_session(sessionmaker(expire_on_commit=False))


def make_engine(settings: Settings) -> Engine:
    return create_engine(
        settings.database_url,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        # MariaDB drops idle connections after wait_timeout (8 h by default); recycle well before.
        pool_recycle=1800,
        pool_pre_ping=True,
        connect_args={"charset": "utf8mb4"},
    )


def bind_session(engine: Engine) -> None:
    SessionLocal.remove()
    SessionLocal.configure(bind=engine)
