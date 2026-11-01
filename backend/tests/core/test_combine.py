import pytest

from app.contract import Limits
from app.core.combine import combine
from tests.core.fakes import article, page

LIMITS = Limits(max_articles=100, max_category_depth=5)


def source(*ids: int):
    return iter([article(i, f"Page {i}") for i in ids])


def ids(result) -> list[int]:
    return [p.page_id for p in result.articles]


@pytest.mark.parametrize(
    ("operation", "expected"),
    [
        ("union", [1, 2, 3, 4, 5, 6]),
        ("intersection", [3]),
        ("difference", [1, 2]),
    ],
)
def test_operations(operation, expected) -> None:
    result = combine(operation, [source(1, 2, 3, 5), source(3, 4, 5), source(3, 6)], LIMITS)
    assert ids(result) == expected
    assert result.report == {
        "operation": operation,
        "inputs": [4, 3, 2],
        "result": len(expected),
    }


def test_the_first_source_copy_of_a_page_wins() -> None:
    older = iter([page(1, "Old title", 0, 10)])
    newer = iter([page(1, "New title", 0, 99)])
    (kept,) = combine("union", [older, newer], LIMITS).articles
    assert (kept.title, kept.revision_id) == ("Old title", 10)


def test_empty_sources() -> None:
    assert ids(combine("intersection", [source(), source(1)], LIMITS)) == []
    assert ids(combine("difference", [source(1, 2), source()], LIMITS)) == [1, 2]


def test_stops_one_past_the_limit() -> None:
    result = combine("union", [source(*range(1, 50)), source(*range(50, 99))], Limits(5, 0))
    assert len(list(result.articles)) == 6


def test_bad_input_is_refused() -> None:
    with pytest.raises(ValueError, match="operation"):
        combine("xor", [source(1), source(2)], LIMITS)  # type: ignore[arg-type]
    with pytest.raises(ValueError, match="two sources"):
        combine("union", [source(1)], LIMITS)
