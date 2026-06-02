"""Re-export dashboard rollup API (implementation lives in profile.py)."""

from scout.api.tpo.profile import get_tpo_dashboard_rollup

__all__ = ["get_tpo_dashboard_rollup"]
