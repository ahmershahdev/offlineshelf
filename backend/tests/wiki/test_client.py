import httpx
import pytest

from app.wiki.client import USER_AGENT, WikiApiError, WikiClient, WikiNetworkError
from tests.wiki.recorded import Script

OK = httpx.Response(200, json={"query": {"pages": []}})
MAXLAG = httpx.Response(
    200,
    headers={"Retry-After": "7"},
    json={"errors": [{"code": "maxlag", "text": "Waiting for db: 6 seconds lagged."}]},
)


def client(transport: httpx.MockTransport, sleeps: list[float], **kw: int) -> WikiClient:
    return WikiClient(httpx.Client(transport=transport), sleep=sleeps.append, **kw)


def test_every_request_identifies_the_project_and_sends_maxlag() -> None:
    transport = Script(OK)
    client(transport, []).action("en.wikipedia.org", {"action": "query"})
    request = transport.requests[0]
    assert request.headers["User-Agent"] == USER_AGENT
    assert "support@ahmershah.dev" in USER_AGENT
    assert request.url.params["maxlag"] == "5"
    assert request.url.params["formatversion"] == "2"


def test_maxlag_waits_at_least_retry_after_then_succeeds() -> None:
    sleeps: list[float] = []
    transport = Script(MAXLAG, OK)
    assert client(transport, sleeps).action("en.wikipedia.org", {}) == OK.json()
    assert len(sleeps) == 1
    assert sleeps[0] >= 7


@pytest.mark.parametrize("status", [429, 500, 502, 503, 504])
def test_temporary_http_errors_are_retried(status: int) -> None:
    sleeps: list[float] = []
    transport = Script(httpx.Response(status, text="busy"), OK)
    client(transport, sleeps).action("en.wikipedia.org", {})
    assert len(transport.requests) == 2


def test_transport_errors_are_retried() -> None:
    transport = Script(httpx.ConnectTimeout("slow"), OK)
    client(transport, []).action("en.wikipedia.org", {})
    assert len(transport.requests) == 2


def test_gives_up_with_a_network_error_after_max_retries() -> None:
    sleeps: list[float] = []
    transport = Script(*[httpx.Response(503) for _ in range(4)])
    with pytest.raises(WikiNetworkError, match="Gave up after 3 retries"):
        client(transport, sleeps, max_retries=3).action("en.wikipedia.org", {})
    assert len(sleeps) == 3
    assert sleeps == sorted(sleeps)


def test_api_errors_are_not_retried() -> None:
    bad = httpx.Response(200, json={"errors": [{"code": "badvalue", "text": "Bad value"}]})
    transport = Script(bad)
    with pytest.raises(WikiApiError, match="badvalue: Bad value"):
        client(transport, []).action("en.wikipedia.org", {})
    assert len(transport.requests) == 1


@pytest.mark.parametrize(
    ("response", "message"),
    [
        (httpx.Response(404, text="nope"), "Not found"),
        (httpx.Response(403, text="no"), "HTTP 403"),
        (httpx.Response(200, text="<html>"), "Not JSON"),
    ],
)
def test_other_failures_are_api_errors(response: httpx.Response, message: str) -> None:
    with pytest.raises(WikiApiError, match=message):
        client(Script(response), []).action("en.wikipedia.org", {})


def test_unparseable_retry_after_falls_back_to_backoff() -> None:
    sleeps: list[float] = []
    busy = httpx.Response(429, headers={"Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT"})
    client(Script(busy, OK), sleeps).action("en.wikipedia.org", {})
    assert 2 <= sleeps[0] < 3


def test_sparql_timeout_is_not_retried() -> None:
    timeout = httpx.Response(500, text="java.util.concurrent.TimeoutException")
    transport = Script(timeout)
    with pytest.raises(WikiApiError, match="timed out"):
        client(transport, []).sparql("SELECT * WHERE {}", timeout=60)
    assert len(transport.requests) == 1


def test_only_wikimedia_hosts_are_contacted() -> None:
    transport = Script()
    with pytest.raises(WikiApiError, match="not an allowed"):
        client(transport, []).action("evil.example.com", {})
    assert transport.requests == []


def test_continuation_feeds_continue_values_back() -> None:
    first = httpx.Response(200, json={"continue": {"cmcontinue": "abc", "continue": "-||"}})
    last = httpx.Response(200, json={"query": {}})
    transport = Script(first, last)
    pages = list(client(transport, []).action_continue("en.wikipedia.org", {"list": "x"}))
    assert len(pages) == 2
    assert transport.requests[1].url.params["cmcontinue"] == "abc"


def test_close_closes_the_http_client() -> None:
    http = httpx.Client(transport=Script())
    WikiClient(http).close()
    assert http.is_closed
