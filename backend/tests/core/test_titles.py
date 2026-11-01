import pytest

from app.core.titles import chunked, normalize_title


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("albert_einstein", "Albert einstein"),
        ("  Albert   Einstein ", "Albert Einstein"),
        (":Main_Page", "Main Page"),
        ("ßeta", "ßeta"),
        ("éclair", "Éclair"),
        ("  _ ", ""),
        (":", ""),
    ],
)
def test_normalize_title(raw: str, expected: str) -> None:
    assert normalize_title(raw) == expected


def test_case_sensitive_wikis_keep_the_first_letter() -> None:
    assert normalize_title("apple_pie", case_sensitive=True) == "apple pie"


def test_chunked() -> None:
    assert [list(c) for c in chunked([1, 2, 3, 4, 5], 2)] == [[1, 2], [3, 4], [5]]
    assert list(chunked([], 3)) == []
