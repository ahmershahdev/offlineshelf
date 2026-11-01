import tracemalloc
from collections.abc import Iterator

from sqlalchemy import func, select

from app.contract import BuildResult, Page
from app.db import SessionLocal
from app.jobs.build import run_build
from app.models import ListArticle, ListVersion, VersionStatus
from tests.jobs.test_build import _queued_version

SIZE = 100_000
# Holding all 100,000 pages at once measures about 19 MiB; streaming peaks near 2 MiB for the build
# and 3 MiB for the export. The ceiling sits between, so collecting the whole list fails the test.
PEAK_LIMIT_BYTES = 8 * 1024 * 1024


def stream(n: int) -> Iterator[Page]:
    for i in range(1, n + 1):
        yield Page(page_id=i, title=f"Article number {i:06d}", namespace=0, revision_id=10 * i)


def test_a_100k_list_builds_and_exports_with_flat_memory(signed_in, builder) -> None:
    builder.result = lambda: BuildResult(stream(SIZE), {})
    version_id = _queued_version(signed_in)

    tracemalloc.start()
    run_build(version_id)
    _, build_peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    v = SessionLocal.get_one(ListVersion, version_id)
    SessionLocal.refresh(v)
    assert v.status is VersionStatus.READY
    assert v.article_count == SIZE
    stored = SessionLocal.scalar(
        select(func.count()).select_from(ListArticle).where(ListArticle.version_id == version_id)
    )
    assert stored == SIZE
    assert build_peak < PEAK_LIMIT_BYTES, f"build peaked at {build_peak / 2**20:.1f} MiB"

    list_id = v.list_id
    tracemalloc.start()
    resp = signed_in.get(f"/api/v1/lists/{list_id}/versions/{version_id}/export.tsv")
    rows = 0
    last = ""
    for chunk in resp.response:
        text = chunk.decode() if isinstance(chunk, bytes) else chunk
        rows += text.count("\n")
        last = text or last
    resp.close()
    _, export_peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    assert rows == SIZE + 5
    assert last.endswith(f"Article number {SIZE:06d}\t{SIZE}\t{10 * SIZE}\n")
    assert export_peak < PEAK_LIMIT_BYTES, f"export peaked at {export_peak / 2**20:.1f} MiB"
