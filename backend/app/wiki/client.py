import contextlib
import logging
import random
import time
from collections.abc import Callable, Iterator, Mapping
from typing import Any
from urllib.parse import quote

import httpx

from app.security.wiki_hosts import is_allowed_wiki

log = logging.getLogger(__name__)

# Wikimedia's User-Agent policy asks for a name, a URL and a contact address; anonymous agents
# get throttled or blocked. https://meta.wikimedia.org/wiki/User-Agent_policy
USER_AGENT = (
    "OfflineShelf/0.1 (https://offlineshelf.ahmershah.dev; support@ahmershah.dev) "
    f"httpx/{httpx.__version__}"
)
WIKIDATA_HOST = "www.wikidata.org"
WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"
WIKIMEDIA_REST = "https://wikimedia.org/api/rest_v1"
RETRYABLE_STATUS = frozenset({429, 500, 502, 503, 504})

Json = dict[str, Any]


class WikiError(Exception):
    pass


class WikiNetworkError(WikiError):
    """Temporary: the build job retries these."""


class WikiApiError(WikiError):
    """The request itself was refused or impossible; retrying would not help."""


class WikiNotFoundError(WikiApiError):
    pass


class WikiClient:
    def __init__(
        self,
        http: httpx.Client | None = None,
        *,
        max_retries: int = 5,
        maxlag: int = 5,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self.http = http or httpx.Client(
            timeout=httpx.Timeout(30.0, connect=10.0), follow_redirects=False
        )
        self.http.headers["User-Agent"] = USER_AGENT
        self.http.headers["Accept-Encoding"] = "gzip"
        self.max_retries = max_retries
        self.maxlag = maxlag
        self.sleep = sleep

    def close(self) -> None:
        self.http.close()

    def action(self, wiki: str, params: Mapping[str, str | int]) -> Json:
        if wiki != WIKIDATA_HOST and not is_allowed_wiki(wiki):
            raise WikiApiError(f"{wiki} is not an allowed Wikimedia wiki")
        query = {
            "format": "json",
            "formatversion": 2,
            "errorformat": "plaintext",
            # maxlag makes the API refuse work while replicas lag, instead of adding load.
            # https://www.mediawiki.org/wiki/Manual:Maxlag_parameter
            "maxlag": self.maxlag,
            **params,
        }
        return self._send("GET", f"https://{wiki}/w/api.php", params=query, action_api=True)

    def action_continue(self, wiki: str, params: Mapping[str, str | int]) -> Iterator[Json]:
        cont: dict[str, str | int] = {}
        while True:
            data = self.action(wiki, {**params, **cont})
            yield data
            if "continue" not in data:
                return
            cont = data["continue"]

    def rest(self, path: str) -> Json:
        return self._send("GET", f"{WIKIMEDIA_REST}{path}")

    def sparql(self, query: str, timeout: float) -> Json:
        return self._send(
            "POST",
            WIKIDATA_SPARQL,
            data={"query": query},
            headers={"Accept": "application/sparql-results+json"},
            timeout=timeout,
        )

    def page_html(self, wiki: str, title: str, revision_id: int | None) -> str:
        """Parsoid HTML of a revision (or the current page when no revision is known)."""
        if not is_allowed_wiki(wiki):
            raise WikiApiError(f"{wiki} is not an allowed Wikimedia wiki")
        if revision_id is not None:
            url = f"https://{wiki}/w/rest.php/v1/revision/{revision_id}/html"
        else:
            url = (
                f"https://{wiki}/w/rest.php/v1/page/{quote(title.replace(' ', '_'), safe='')}/html"
            )
        attempt = 0
        while True:
            attempt += 1
            response = self._response(attempt, "GET", url)
            if response is not None:
                return response.text

    def _send(self, method: str, url: str, *, action_api: bool = False, **kwargs: Any) -> Json:
        attempt = 0
        while True:
            attempt += 1
            response = self._response(attempt, method, url, **kwargs)
            if response is None:
                continue
            try:
                data: Json = response.json()
            except ValueError as exc:
                raise WikiApiError(f"Not JSON: {url}") from exc

            if action_api and "errors" in data:
                code = data["errors"][0].get("code", "")
                if code == "maxlag":
                    self._backoff(attempt, response, "replication lag (maxlag)")
                    continue
                info = data["errors"][0].get("text", code)
                raise WikiApiError(f"MediaWiki error {code}: {info}")
            return data

    def _response(
        self, attempt: int, method: str, url: str, **kwargs: Any
    ) -> httpx.Response | None:
        """One attempt: the response, or None after backing off for a retryable failure."""
        try:
            response = self.http.request(method, url, **kwargs)
        except httpx.TransportError as exc:
            self._backoff(attempt, None, f"{type(exc).__name__} for {url}")
            return None

        if response.status_code in RETRYABLE_STATUS:
            if _is_sparql_timeout(response):
                raise WikiApiError("The SPARQL query timed out. Narrow it down and try again.")
            self._backoff(attempt, response, f"HTTP {response.status_code} for {url}")
            return None
        if response.status_code == 404:
            raise WikiNotFoundError(f"Not found: {url}")
        if response.is_error:
            raise WikiApiError(f"HTTP {response.status_code} for {url}")
        return response

    def _backoff(self, attempt: int, response: httpx.Response | None, reason: str) -> None:
        if attempt > self.max_retries:
            raise WikiNetworkError(f"Gave up after {self.max_retries} retries: {reason}")
        delay = min(2**attempt, 60) + random.uniform(0, 1)  # noqa: S311  (jitter, not crypto)
        if response is not None and (retry_after := response.headers.get("Retry-After")):
            with contextlib.suppress(ValueError):
                delay = max(delay, min(float(retry_after), 300))
        log.warning("Retrying in %.1fs (attempt %d): %s", delay, attempt, reason)
        self.sleep(delay)


def _is_sparql_timeout(response: httpx.Response) -> bool:
    # WDQS reports its 60 s query limit as a 500 with a Java stack trace in the body. Retrying a
    # query that hit the limit only hits it again.
    return response.status_code == 500 and "TimeoutException" in response.text
