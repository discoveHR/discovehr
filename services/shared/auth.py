import os

from fastapi import Header, HTTPException


def internal_secret() -> str:
    return (os.getenv("SCOUT_SERVICE_INTERNAL_SECRET") or "").strip()


def require_internal(x_scout_internal: str | None = Header(default=None, alias="X-Scout-Internal")) -> None:
    secret = internal_secret()
    if not secret:
        raise HTTPException(status_code=503, detail="SCOUT_SERVICE_INTERNAL_SECRET not configured")
    if (x_scout_internal or "").strip() != secret:
        raise HTTPException(status_code=401, detail="Invalid internal credentials")
