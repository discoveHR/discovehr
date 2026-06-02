#!/usr/bin/env bash
# Stable local bench: no Werkzeug reloader (avoids 502s on every .py save).
set -euo pipefail

BENCH_ROOT="${FRAPPE_BENCH_ROOT:-/home/dell/frappe-bench}"
SITE="${FRAPPE_SITE:-scout.localhost}"
SCOUT_REPO="${SCOUT_REPO:-/mnt/c/Users/Dell/Documents/Scout express}"

cd "$BENCH_ROOT"

if [[ -d "$SCOUT_REPO/backend/apps/scout" ]]; then
  ln -sfn "$SCOUT_REPO/backend/apps/scout" apps/scout 2>/dev/null || true
fi

if [[ -f "$SCOUT_REPO/backend/.env" ]]; then
  cp -f "$SCOUT_REPO/backend/.env" .env 2>/dev/null || true
fi

echo "Syncing Scout DocTypes (if needed)..."
bench --site "$SITE" execute scout.bootstrap.sync_scout_doctypes_if_needed --kwargs '{"force": true}' || true

echo "Migrating site $SITE..."
bench --site "$SITE" migrate

echo "Starting bench without auto-reload (set SCOUT_BENCH_RELOAD=1 to enable)..."
export FRAPPE_SITE="$SITE"
if [[ "${SCOUT_BENCH_RELOAD:-0}" == "1" ]]; then
  exec bench start
fi

# Serve + workers without Werkzeug reloader on the web process
exec bench serve --port 8000 --noreload
