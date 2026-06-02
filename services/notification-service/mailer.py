"""Postmark sender for the Scout notification service."""

from __future__ import annotations

import os


def _conf(*keys: str, default: str = "") -> str:
    for key in keys:
        val = (os.getenv(key) or "").strip()
        if val:
            return val
    return default


def postmark_configured() -> bool:
    return bool(_conf("SCOUT_POSTMARK_SERVER_TOKEN", "POSTMARK_SERVER_TOKEN") and mail_from())


def mail_from() -> str:
    return _conf("SCOUT_MAIL_FROM", "MAIL_FROM")


def normalize_recipients(recipients: str | list[str]) -> list[str]:
    if isinstance(recipients, str):
        parts = recipients.replace(";", ",").split(",")
        return [p.strip().lower() for p in parts if p.strip()]
    return [str(r).strip().lower() for r in recipients if str(r).strip()]


def send_email(
    *,
    recipients: list[str],
    subject: str,
    message: str,
    sender: str | None = None,
    reply_to: str | None = None,
) -> None:
    import httpx

    token = _conf("SCOUT_POSTMARK_SERVER_TOKEN", "POSTMARK_SERVER_TOKEN")
    from_addr = sender or mail_from()

    payload: dict = {
        "From": from_addr,
        "To": ", ".join(recipients),
        "Subject": subject,
        "HtmlBody": message,
    }
    if reply_to:
        payload["ReplyTo"] = reply_to

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token,
    }

    resp = httpx.post("https://api.postmarkapp.com/email", json=payload, headers=headers, timeout=25.0)
    resp.raise_for_status()
