import re
from pathlib import Path

SPEC = Path(__file__).resolve().parents[3] / "docs" / "openapi.yaml"


def _spec_routes() -> set[tuple[str, str]]:
    routes: set[tuple[str, str]] = set()
    path = None
    for line in SPEC.read_text(encoding="utf-8").splitlines():
        if m := re.match(r"^  (/[^:]*):\s*$", line):
            path = re.sub(r"\{[^}]+\}", "<id>", m.group(1))
        elif path and (m := re.match(r"^    (get|post|put|patch|delete):", line)):
            routes.add((m.group(1).upper(), path))
        elif re.match(r"^\S", line):
            path = None
    return routes


def test_every_api_route_is_documented_and_vice_versa(app) -> None:
    flask_routes = {
        (method, re.sub(r"<[^>]+>", "<id>", rule.rule.removeprefix("/api/v1")))
        for rule in app.url_map.iter_rules()
        if rule.rule.startswith("/api/v1")
        for method in rule.methods - {"HEAD", "OPTIONS"}
    }
    assert flask_routes == _spec_routes()
