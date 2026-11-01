import re
from collections.abc import Iterator, Sequence

_SPACES = re.compile(r"[ _]+")


def normalize_title(title: str, *, case_sensitive: bool = False) -> str:
    """The title MediaWiki would use for `title`, or "" if nothing is left.

    Underscores and runs of spaces become one space, the ends are trimmed, a leading ":" (which
    forces the main namespace in a link) is dropped, and the first letter is uppercased unless the
    wiki is case-sensitive (Wiktionary).
    """
    text = _SPACES.sub(" ", title).strip().removeprefix(":").strip()
    if not text or case_sensitive:
        return text
    first = text[0].upper()
    # Some letters uppercase to two characters ("ß" to "SS"); MediaWiki leaves those alone.
    if len(first) != 1:
        return text
    return first + text[1:]


def chunked[T](items: Sequence[T], size: int) -> Iterator[Sequence[T]]:
    for start in range(0, len(items), size):
        yield items[start : start + size]
