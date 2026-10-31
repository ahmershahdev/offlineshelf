import logging

from redis import Redis
from rq import Worker

from app.config import get_settings
from app.db import bind_session, make_engine


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    settings = get_settings()
    bind_session(make_engine(settings))
    redis = Redis.from_url(settings.redis_url)
    Worker(["default"], connection=redis).work(with_scheduler=True)


if __name__ == "__main__":
    main()
