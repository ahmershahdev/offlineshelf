def test_health_reports_database_and_redis(api) -> None:
    resp = api.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.get_json() == {"status": "ok", "checks": {"database": "ok", "redis": "ok"}}


def test_security_headers_on_every_response(api) -> None:
    resp = api.get("/api/v1/health")
    assert resp.headers["Content-Security-Policy"].startswith("default-src 'none'")
    assert resp.headers["X-Content-Type-Options"] == "nosniff"
    assert resp.headers["X-Frame-Options"] == "DENY"
    assert resp.headers["Cache-Control"] == "no-store"
    assert len(resp.headers["X-Request-ID"]) == 32


def test_unknown_route_is_problem_json(api) -> None:
    resp = api.get("/api/v1/nope")
    assert resp.status_code == 404
    assert resp.mimetype == "application/problem+json"
    assert resp.get_json()["status"] == 404


def test_request_id_from_proxy_is_kept_only_when_safe(api) -> None:
    good = api.get("/api/v1/health", headers={"X-Request-ID": "abcdef12-3456"})
    assert good.headers["X-Request-ID"] == "abcdef12-3456"
    bad = api.get("/api/v1/health", headers={"X-Request-ID": "not a valid id; drop"})
    assert bad.headers["X-Request-ID"] != "not a valid id; drop"
