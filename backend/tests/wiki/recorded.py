import json
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl

import httpx

RECORDINGS = Path(__file__).parent / "recordings"

# Volatile params are left out of matching so a recording keeps working when the client's
# defaults change (for example a different maxlag).
IGNORED_PARAMS = frozenset({"maxlag", "format", "formatversion", "errorformat"})


def request_key(request: httpx.Request) -> dict[str, Any]:
    params = dict(request.url.params)
    if request.method == "POST" and request.content:
        params.update(parse_qsl(request.content.decode()))
    return {
        "method": request.method,
        "url": f"{request.url.scheme}://{request.url.host}{request.url.path}",
        "params": {k: v for k, v in sorted(params.items()) if k not in IGNORED_PARAMS},
    }


class Replay(httpx.MockTransport):
    """Serves recorded exchanges. An unrecorded request fails the test instead of going live."""

    def __init__(self, *names: str) -> None:
        self.exchanges: list[dict[str, Any]] = []
        for name in names:
            self.exchanges += json.loads((RECORDINGS / f"{name}.json").read_text("utf-8"))
        self.requests: list[httpx.Request] = []
        super().__init__(self._handle)

    def _handle(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        key = request_key(request)
        for exchange in self.exchanges:
            if exchange["request"] == key:
                r = exchange["response"]
                if "text" in r:
                    return httpx.Response(r["status"], headers=r["headers"], text=r["text"])
                return httpx.Response(r["status"], headers=r["headers"], json=r["body"])
        raise AssertionError(f"No recording for {key}")


class Script(httpx.MockTransport):
    """Returns the given responses in order; for retry and error paths no live API produces
    on demand."""

    def __init__(self, *responses: httpx.Response | Exception) -> None:
        self.queue = list(responses)
        self.requests: list[httpx.Request] = []
        super().__init__(self._handle)

    def _handle(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        item = self.queue.pop(0)
        if isinstance(item, Exception):
            raise item
        return item
