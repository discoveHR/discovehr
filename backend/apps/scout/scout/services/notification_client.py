from __future__ import annotations

from scout.services.config import notification_service_url, use_notification_service
from scout.services.http_client import post_json


def enqueue_email(
    recipients: str | list[str],
    subject: str,
    message: str,
    *,
    sender: str | None = None,
    reply_to: str | None = None,
) -> bool:
    if not use_notification_service():
        return False

    post_json(
        notification_service_url(),
        "/v1/email/enqueue",
        {
            "recipients": recipients,
            "subject": subject,
            "message": message,
            "sender": sender,
            "replyTo": reply_to,
        },
        timeout=10,
    )
    return True
