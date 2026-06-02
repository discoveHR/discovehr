"""Feature flags and URLs for sidecar microservices."""

from __future__ import annotations

import os

from scout.utils.env_config import load_scout_env_files, scout_conf


def _truthy(val: str) -> bool:
    return val.strip().lower() in ("1", "true", "yes", "on")


def microservices_enabled() -> bool:
    load_scout_env_files()
    flag = scout_conf("use_microservices", "SCOUT_USE_MICROSERVICES", default="")
    if flag:
        return _truthy(flag)
    return bool(integration_service_url() or notification_service_url() or payment_service_url())


def internal_secret() -> str:
    load_scout_env_files()
    return scout_conf("service_internal_secret", "SCOUT_SERVICE_INTERNAL_SECRET", default="")


def integration_service_url() -> str:
    load_scout_env_files()
    return scout_conf("integration_service_url", "SCOUT_INTEGRATION_SERVICE_URL", default="").rstrip("/")


def notification_service_url() -> str:
    load_scout_env_files()
    return scout_conf("notification_service_url", "SCOUT_NOTIFICATION_SERVICE_URL", default="").rstrip("/")


def payment_service_url() -> str:
    load_scout_env_files()
    return scout_conf("payment_service_url", "SCOUT_PAYMENT_SERVICE_URL", default="").rstrip("/")


def use_integration_service() -> bool:
    return microservices_enabled() and bool(integration_service_url())


def use_notification_service() -> bool:
    return microservices_enabled() and bool(notification_service_url())


def use_payment_service() -> bool:
    return microservices_enabled() and bool(payment_service_url())
