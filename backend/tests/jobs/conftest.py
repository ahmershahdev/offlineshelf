from collections.abc import Iterator
from types import SimpleNamespace

import pytest

from app.contract import BuildResult, Page
from app.jobs import build as build_module


def pages(n: int) -> Iterator[Page]:
    for i in range(1, n + 1):
        yield Page(page_id=i, title=f"Article {i}", namespace=0, revision_id=1000 + i)


@pytest.fixture
def builder(monkeypatch):
    """The core builder is the maintainer's; tests stand in a fake with the same signature."""
    calls: list[dict[str, object]] = []
    state = SimpleNamespace(result=lambda: BuildResult(pages(3), {"missing": []}), calls=calls)

    def fake(source, params, limits):
        calls.append({"wiki": source.wiki, "params": dict(params), "limits": limits})
        outcome = state.result()
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    monkeypatch.setattr(build_module, "resolve_builder", lambda _kind: fake)
    monkeypatch.setattr(
        build_module, "make_source", lambda wiki, _settings: SimpleNamespace(wiki=wiki)
    )
    return state
