import logging

from redis import Redis
from rq.cron import CronScheduler

from app.config import get_settings
from app.jobs.export import delete_expired_exports
from app.jobs.recover import recover_stalled
from app.jobs.schedule import DISPATCH_INTERVAL_SECONDS, dispatch_scheduled_builds


def make_scheduler(redis: Redis) -> CronScheduler:
    # An interval, not a monthly cron entry: the dispatcher is idempotent, so running it hourly
    # catches up after downtime, where a cron entry missed on the 1st would wait a whole month.
    scheduler = CronScheduler(connection=redis)
    scheduler.register(
        dispatch_scheduled_builds, queue_name="default", interval=DISPATCH_INTERVAL_SECONDS
    )
    scheduler.register(
        delete_expired_exports, queue_name="default", interval=DISPATCH_INTERVAL_SECONDS
    )
    scheduler.register(recover_stalled, queue_name="default", interval=DISPATCH_INTERVAL_SECONDS)
    return scheduler


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    make_scheduler(Redis.from_url(get_settings().redis_url)).start()  # type: ignore[no-untyped-call]


if __name__ == "__main__":
    main()
