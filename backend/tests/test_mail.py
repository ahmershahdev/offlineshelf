import pytest
from pydantic import SecretStr

from app import mail
from app.config import get_settings


class FakeSMTP:
    instances: list["FakeSMTP"] = []  # noqa: RUF012

    def __init__(self, host: str, port: int, timeout: int) -> None:
        self.address = (host, port, timeout)
        self.calls: list[str] = []
        self.sent: list[object] = []
        FakeSMTP.instances.append(self)

    def __enter__(self) -> "FakeSMTP":
        return self

    def __exit__(self, *exc: object) -> None:
        self.calls.append("quit")

    def starttls(self, context: object) -> None:  # noqa: ARG002
        self.calls.append("starttls")

    def login(self, user: str, password: str) -> None:
        self.calls.append(f"login {user} {password}")

    def send_message(self, msg: object) -> None:
        self.sent.append(msg)


@pytest.fixture
def smtp(monkeypatch):
    FakeSMTP.instances = []
    monkeypatch.setattr(mail.smtplib, "SMTP", FakeSMTP)
    return FakeSMTP


def test_without_a_host_nothing_is_sent(smtp) -> None:
    assert not mail.send_email(get_settings(), "a@example.org", "Hi", "Body")
    assert smtp.instances == []


def test_sends_with_starttls_and_login(smtp) -> None:
    settings = get_settings().model_copy(
        update={
            "smtp_host": "smtp.example.org",
            "smtp_username": "user",
            "smtp_password": SecretStr("pw"),
        }
    )
    assert mail.send_email(settings, "a@example.org", "Hi", "Body")
    conn = smtp.instances[0]
    assert conn.address == ("smtp.example.org", 587, 30)
    assert conn.calls == ["starttls", "login user pw", "quit"]
    msg = conn.sent[0]
    assert msg["To"] == "a@example.org"
    assert msg["Subject"] == "Hi"
    assert msg["From"] == settings.mail_from
    assert msg.get_content().strip() == "Body"


def test_plain_smtp_without_auth(smtp) -> None:
    settings = get_settings().model_copy(
        update={"smtp_host": "localhost", "smtp_port": 25, "smtp_starttls": False}
    )
    assert mail.send_email(settings, "a@example.org", "Hi", "Body")
    assert smtp.instances[0].calls == ["quit"]
