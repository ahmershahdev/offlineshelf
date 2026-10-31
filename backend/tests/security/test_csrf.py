BODY = {"email": "reader@example.org", "password": "correct horse battery"}


def test_post_without_token_is_rejected(app) -> None:
    client = app.test_client()
    resp = client.post("/api/v1/auth/register", json=BODY)
    assert resp.status_code == 403


def test_post_with_wrong_token_is_rejected(app) -> None:
    client = app.test_client()
    client.get("/api/v1/auth/csrf")
    resp = client.post("/api/v1/auth/register", json=BODY, headers={"X-CSRF-Token": "guess"})
    assert resp.status_code == 403


def test_cross_site_fetch_is_rejected_even_with_token(api) -> None:
    api.refresh_csrf()
    resp = api.send("POST", "/api/v1/auth/register", BODY, headers={"Sec-Fetch-Site": "cross-site"})
    assert resp.status_code == 403


def test_foreign_origin_is_rejected(api) -> None:
    resp = api.send(
        "POST", "/api/v1/auth/register", BODY, headers={"Origin": "https://evil.example"}
    )
    assert resp.status_code == 403


def test_token_rotates_on_login(api) -> None:
    api.refresh_csrf()
    before = api.token
    api.send("POST", "/api/v1/auth/register", BODY)
    assert api.token != before
