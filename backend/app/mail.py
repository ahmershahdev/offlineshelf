import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.config import Settings

log = logging.getLogger(__name__)

SMTP_TIMEOUT_SECONDS = 30
SMTPS_PORT = 465


def send_email(settings: Settings, to: str, subject: str, body: str) -> bool:
    """Send a plain-text email. Returns False when SMTP is not configured."""
    if not settings.smtp_host:
        log.info("SMTP is not configured; not sending %r", subject)
        return False
    msg = EmailMessage()
    msg["From"] = settings.mail_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    # Always encrypted, always with certificate checks: implicit TLS on 465, STARTTLS otherwise.
    context = ssl.create_default_context()
    host, port = settings.smtp_host, settings.smtp_port
    smtp: smtplib.SMTP
    if port == SMTPS_PORT:
        smtp = smtplib.SMTP_SSL(host, port, timeout=SMTP_TIMEOUT_SECONDS, context=context)
    else:
        smtp = smtplib.SMTP(host, port, timeout=SMTP_TIMEOUT_SECONDS)
    with smtp:
        if port != SMTPS_PORT:
            smtp.starttls(context=context)
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password.get_secret_value())
        smtp.send_message(msg)
    return True
