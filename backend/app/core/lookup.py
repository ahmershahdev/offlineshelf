from collections.abc import Sequence
from dataclasses import dataclass, field

from app.contract import Page, WikiSource


@dataclass(slots=True)
class Lookup:
    """What MediaWiki made of a group of titles, keyed by the title as it was asked for."""

    pages: dict[str, Page] = field(default_factory=dict)
    redirected: set[str] = field(default_factory=set)
    missing: list[str] = field(default_factory=list)
    invalid: list[str] = field(default_factory=list)
    special: list[str] = field(default_factory=list)


def lookup(source: WikiSource, titles: Sequence[str]) -> Lookup:
    normalized: dict[str, str] = {}
    redirects: dict[str, str] = {}
    by_title: dict[str, Page] = {}
    missing: set[str] = set()
    invalid: set[str] = set()
    special: set[str] = set()
    for batch in source.query_pages(titles):
        normalized.update(batch.normalized)
        redirects.update(batch.redirects)
        by_title.update((p.title, p) for p in batch.pages)
        missing.update(batch.missing)
        invalid.update(batch.invalid)
        special.update(batch.special)

    result = Lookup()
    for title in titles:
        # MediaWiki reports each step separately: the spelling it normalised the input to, then
        # the redirect that spelling points at. Follow both to reach the page.
        spelled = normalized.get(title, title)
        target = redirects.get(spelled, spelled)
        page = by_title.get(target)
        if page is not None:
            result.pages[title] = page
            if spelled in redirects:
                result.redirected.add(title)
        elif title in invalid or spelled in invalid:
            result.invalid.append(title)
        elif spelled in special:
            result.special.append(title)
        else:
            result.missing.append(title)
    return result
