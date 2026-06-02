"""Notification service: outbound email off the Frappe request path."""

from __future__ import annotations

import sys
from pathlib import Path

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field

_root = Path(__file__).resolve().parent
for _candidate in (_root, _root.parent):
    if (_candidate / "shared").is_dir():
        sys.path.insert(0, str(_candidate))
        break
from shared.auth import require_internal  # noqa: E402

from mailer import postmark_configured, normalize_recipients, send_email  # noqa: E402

app = FastAPI(title="Scout Notification Service", version="1.0.0")


class SendEmailRequest(BaseModel):
    recipients: str | list[str]
    subject: str
    message: str
    sender: str | None = None
    replyTo: str | None = None


def _do_send(body: SendEmailRequest) -> None:
    to_list = normalize_recipients(body.recipients)
    if not to_list:
        raise ValueError("No recipients")
    if not postmark_configured():
        raise RuntimeError("Postmark not configured on notification-service")
    send_email(
        recipients=to_list,
        subject=body.subject,
        message=body.message,
        sender=body.sender,
        reply_to=body.replyTo,
    )


@app.get("/health")
def health():
    return {"ok": True, "service": "notification", "postmark": postmark_configured()}


@app.post("/v1/email/send")
def send_sync(body: SendEmailRequest, _: None = Depends(require_internal)):
    try:
        _do_send(body)
        return {"ok": True, "sent": True}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/v1/email/enqueue")
def send_async(body: SendEmailRequest, background_tasks: BackgroundTasks, _: None = Depends(require_internal)):
    background_tasks.add_task(_do_send, body)
    return {"ok": True, "queued": True}
