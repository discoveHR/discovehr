#!/usr/bin/env bash
# Wipe scout.localhost database and recreate a fresh dev site (DESTRUCTIVE).
# Run in WSL: bash backend/scripts/reset-dev-site.sh
set -euo pipefail

BENCH_ROOT="${FRAPPE_BENCH_ROOT:-/home/dell/frappe-bench}"
SITE="${FRAPPE_SITE:-scout.localhost}"
ADMIN_PASSWORD="${SCOUT_ADMIN_PASSWORD:-Admin@123}"
SCOUT_REPO="${SCOUT_REPO:-/mnt/c/Users/Dell/Documents/Scout express}"
DB_ROOT_PASSWORD="${MARIADB_ROOT_PASSWORD:-}"

cd "$BENCH_ROOT"

echo "==> Stopping bench if running (ignore errors)..."
pkill -f "bench serve" 2>/dev/null || true
pkill -f "frappe serve" 2>/dev/null || true
sleep 2

echo "==> Backing up site_config.json..."
SITE_CONFIG="sites/${SITE}/site_config.json"
BACKUP="/tmp/${SITE}-site_config.backup.json"
if [[ -f "$SITE_CONFIG" ]]; then
  cp -f "$SITE_CONFIG" "$BACKUP"
fi

echo "==> Dropping site ${SITE} (all data removed)..."
bench drop-site "$SITE" --force --db-root-password "$DB_ROOT_PASSWORD"

echo "==> Creating fresh site ${SITE}..."
bench new-site "$SITE" --admin-password "$ADMIN_PASSWORD" --db-root-password "$DB_ROOT_PASSWORD" --no-mariadb-socket

if [[ -f "$BACKUP" ]]; then
  echo "==> Restoring site_config.json (CORS, Moodle, etc.)..."
  cp -f "$BACKUP" "$SITE_CONFIG"
  bench --site "$SITE" set-config allow_cors "http://localhost:3000" 2>/dev/null || true
  bench --site "$SITE" set-config allow_cors "http://localhost:3001" 2>/dev/null || true
fi

if [[ -d "$SCOUT_REPO/backend/apps/scout" ]]; then
  ln -sfn "$SCOUT_REPO/backend/apps/scout" apps/scout 2>/dev/null || true
fi

echo "==> Installing Scout app..."
bench --site "$SITE" install-app scout

echo "==> Migrating..."
bench --site "$SITE" migrate

echo "==> Clearing cache..."
bench --site "$SITE" clear-cache

echo ""
echo "Done. Fresh site: ${SITE}"
echo "  Frappe admin: Administrator / ${ADMIN_PASSWORD}"
echo "  Clear browser localStorage before portal sign-in."
