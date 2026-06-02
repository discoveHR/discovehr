"""Load Scout settings from environment and optional .env file."""

from __future__ import annotations

import os
from pathlib import Path

_LOADED = False


def _parse_env_file(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def _env_file_candidates() -> list[Path]:
    here = Path(__file__).resolve()
    candidates: list[Path] = []
    # apps/scout/scout/utils → walk up to bench app root and repo backend/
    for depth in range(2, 7):
        if depth < len(here.parents):
            candidates.append(here.parents[depth] / ".env")
    bench_root = (os.environ.get("FRAPPE_BENCH_ROOT") or os.environ.get("BENCH_ROOT") or "").strip()
    if bench_root:
        candidates.append(Path(bench_root) / ".env")
        candidates.append(Path(bench_root) / "sites" / ".env")
    site = (os.environ.get("FRAPPE_SITE") or "").strip()
    if bench_root and site:
        candidates.append(Path(bench_root) / "sites" / site / ".env")
    # De-dupe while preserving order
    seen: set[str] = set()
    unique: list[Path] = []
    for path in candidates:
        key = str(path)
        if key not in seen:
            seen.add(key)
            unique.append(path)
    return unique


def load_scout_env_files() -> None:
    """Load .env once per worker (does not override existing env vars)."""
    global _LOADED
    if _LOADED:
        return
    _LOADED = True

    for path in _env_file_candidates():
        _parse_env_file(path)


def scout_conf(key: str, *env_names: str, default: str = "") -> str:
    """Resolve config: process env (several names) → frappe.conf → site_config → default."""
    load_scout_env_files()

    names = env_names or (key,)
    for name in names:
        val = (os.getenv(name) or "").strip()
        if val:
            return val

    try:
        import frappe

        for name in names:
            snake = name.lower()
            for candidate in (snake, key, key.lower()):
                val = getattr(frappe.conf, candidate, None) or frappe.local.conf.get(candidate)
                if val:
                    return str(val).strip()
    except Exception:
        pass

    return (default or "").strip()


def razorpay_key_id() -> str:
    return scout_conf(
        "razorpay_key_id",
        "RAZORPAY_KEY_ID",
        "SCOUT_RAZORPAY_KEY_ID",
    )


def razorpay_key_secret() -> str:
    return scout_conf(
        "razorpay_key_secret",
        "RAZORPAY_KEY_SECRET",
        "SCOUT_RAZORPAY_KEY_SECRET",
    )


def get_frontend_base_url() -> str:
    """
    Return the configured frontend base URL, stripping any trailing slash.

    In production this MUST be set to the real domain via:
      - env var:        SCOUT_FRONTEND_BASE_URL=https://yourdomain.com
      - site_config:    scout_frontend_base_url = "https://yourdomain.com"

    Falls back to http://localhost:3000 for local dev only.
    Logs a warning once if localhost is returned in a non-dev context.
    """
    url = scout_conf(
        "scout_frontend_base_url",
        "SCOUT_FRONTEND_BASE_URL",
        default="http://localhost:3000",
    ).rstrip("/")

    if "localhost" in url or "127.0.0.1" in url:
        try:
            import frappe
            if not getattr(frappe.local, "_scout_frontend_url_warned", False):
                frappe.local._scout_frontend_url_warned = True
                frappe.logger().warning(
                    "SCOUT_FRONTEND_BASE_URL is set to %s — magic links in emails will point to localhost. "
                    "Set SCOUT_FRONTEND_BASE_URL to your production domain in backend/.env or site_config.json.",
                    url,
                )
        except Exception:
            pass

    return url
