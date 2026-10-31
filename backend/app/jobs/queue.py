from redis import Redis
from rq import Queue

from app.config import get_settings

# A build that runs longer than this is killed and marked failed; the previous good version
# stays current. Large category trees are the slow case.
BUILD_TIMEOUT_SECONDS = 30 * 60


def get_queue(name: str = "default", connection: Redis | None = None) -> Queue:
    redis = connection or Redis.from_url(get_settings().redis_url)
    return Queue(name, connection=redis, default_timeout=BUILD_TIMEOUT_SECONDS)
