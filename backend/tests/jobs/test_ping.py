from rq import SimpleWorker

from app.jobs.ping import ping
from app.jobs.queue import get_queue


def test_job_runs_end_to_end(redis) -> None:
    queue = get_queue(connection=redis)
    job = queue.enqueue(ping, "shelf")
    SimpleWorker([queue], connection=redis).work(burst=True)
    job.refresh()
    assert job.is_finished
    assert job.return_value() == "pong:shelf"
