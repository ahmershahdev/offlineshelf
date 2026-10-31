from app import create_app
from app.config import get_settings


def test_login_is_rate_limited(redis) -> None:
    settings = get_settings().model_copy(update={"env": "dev", "rate_limit_auth": "2 per minute"})
    app = create_app(settings)
    client = app.test_client()
    token = client.get("/api/v1/auth/csrf").get_json()["token"]
    body = {"email": "x@example.org", "password": "wrong password here"}
    codes = [
        client.post("/api/v1/auth/login", json=body, headers={"X-CSRF-Token": token}).status_code
        for _ in range(3)
    ]
    assert codes == [401, 401, 429]
