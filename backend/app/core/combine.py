"""Union, intersection and difference of lists. docs/core-contract.md describes the input."""

import heapq
from collections.abc import Iterator, Sequence
from itertools import groupby
from operator import itemgetter
from typing import Any

from app.contract import BuildResult, Limits, Operation, Page

OPERATIONS: tuple[Operation, ...] = ("union", "intersection", "difference")


def combine(operation: Operation, sources: Sequence[Iterator[Page]], limits: Limits) -> BuildResult:
    if operation not in OPERATIONS:
        raise ValueError(f"unknown operation {operation!r}")
    if len(sources) < 2:
        raise ValueError("a combination needs at least two sources")
    report: dict[str, Any] = {
        "operation": operation,
        "inputs": [0] * len(sources),
        "result": 0,
    }
    return BuildResult(_merge(operation, sources, report, limits), report)


def _tagged(
    index: int, pages: Iterator[Page], counts: list[int]
) -> Iterator[tuple[int, int, Page]]:
    for page in pages:
        counts[index] += 1
        yield page.page_id, index, page


def _merge(
    operation: Operation,
    sources: Sequence[Iterator[Page]],
    report: dict[str, Any],
    limits: Limits,
) -> Iterator[Page]:
    # Every source is sorted by page_id, so one pass over their merge sees each page's copies
    # side by side; nothing is held beyond the current page. Ties sort by source index, so the
    # first copy of a page comes from the earliest source, and that copy is the one kept.
    counts: list[int] = report["inputs"]
    merged = heapq.merge(*(_tagged(i, s, counts) for i, s in enumerate(sources)))
    everyone = len(sources)
    for _, copies in groupby(merged, key=itemgetter(0)):
        found = list(copies)
        present = {index for _, index, _ in found}
        if operation == "union":
            keep = True
        elif operation == "intersection":
            keep = len(present) == everyone
        else:
            keep = present == {0}
        if keep:
            report["result"] += 1
            yield found[0][2]
            # One past the limit is enough for the job to fail the build with its message.
            if report["result"] > limits.max_articles:
                return
