"""HTTP clients for Scout sidecar microservices (optional; falls back to in-process)."""

from scout.services.config import microservices_enabled

__all__ = ["microservices_enabled"]
