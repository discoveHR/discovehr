"""Integration service: Moodle + TAO webhook ingress with retries."""

from __future__ import annotations

import hashlib
import hmac
import os
import sys
from pathlib import Path

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Request
from pydantic import BaseModel

_root = Path(__file__).resolve().parent
for _candidate in (_root, _root.parent):
    if (_candidate / "shared").is_dir():
        sys.path.insert(0, str(_candidate))
        break
from shared.auth import require_internal  # noqa: E402

from moodle import student_lms_context  # noqa: E402

app = FastAPI(title="Scout Integration Service", version="1.0.0")


class MoodleContextRequest(BaseModel):
    platformUserId: str
    email: str
    fullName: str = ""


@app.get("/health")
def health():
    return {"ok": True, "service": "integration"}


@app.post("/v1/moodle/student-context")
def moodle_student_context(body: MoodleContextRequest, _: None = Depends(require_internal)):
    try:
        data = student_lms_context(
            email=body.email.strip().lower(),
            full_name=body.fullName,
            platform_user_id=body.platformUserId,
        )
        return {"ok": True, "data": data}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


def _tao_secret() -> str:
    return (os.getenv("SCOUT_TAO_WEBHOOK_SECRET") or "").strip()


def _frappe_base() -> str:
    return (os.getenv("SCOUT_FRAPPE_BASE_URL") or "http://127.0.0.1:8000").strip().rstrip("/")


def _verify_tao_signature(raw_body: bytes, signature: str) -> bool:
    secret = _tao_secret()
    if not secret:
        return False
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, (signature or "").strip())


def _forward_to_frappe(path: str, raw_body: bytes, signature: str) -> None:
    import time

    import httpx

    url = f"{_frappe_base()}{path}"
    headers = {
        "Content-Type": "application/json",
        "X-Tao-Signature": signature,
        "X-Scout-Signature": signature,
    }
    internal = (os.getenv("SCOUT_SERVICE_INTERNAL_SECRET") or "").strip()
    if internal:
        headers["X-Scout-Internal"] = internal

    for delay in (0, 2, 5):
        if delay:
            time.sleep(delay)
        try:
            resp = httpx.post(url, content=raw_body, headers=headers, timeout=30.0)
            if resp.status_code < 500:
                return
        except Exception:
            continue


@app.post("/v1/webhooks/tao/psychometric")
async def webhook_psychometric(
    request: Request,
    background_tasks: BackgroundTasks,
    x_tao_signature: str | None = Header(default=None, alias="X-Tao-Signature"),
    x_scout_signature: str | None = Header(default=None, alias="X-Scout-Signature"),
):
    raw = await request.body()
    sig = (x_tao_signature or x_scout_signature or "").strip()
    if not _verify_tao_signature(raw, sig):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    path = "/api/method/scout.api.psychometric_api.tao_results_webhook"
    background_tasks.add_task(_forward_to_frappe, path, raw, sig)
    return {"ok": True, "queued": True}


@app.post("/v1/webhooks/tao/aptitude")
async def webhook_aptitude(
    request: Request,
    background_tasks: BackgroundTasks,
    x_tao_signature: str | None = Header(default=None, alias="X-Tao-Signature"),
    x_scout_signature: str | None = Header(default=None, alias="X-Scout-Signature"),
):
    raw = await request.body()
    sig = (x_tao_signature or x_scout_signature or "").strip()
    if not _verify_tao_signature(raw, sig):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    path = "/api/method/scout.api.aptitude_api.tao_aptitude_results_webhook"
    background_tasks.add_task(_forward_to_frappe, path, raw, sig)
    return {"ok": True, "queued": True}
