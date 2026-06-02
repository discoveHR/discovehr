#!/usr/bin/env bash
# Stable local API dev: Redis + bench serve (no honcho worker that kills the whole stack).
# Set SCOUT_BENCH_FULL=1 to use full `bench start` (worker, watch, schedule) when you need background jobs.
set -euo pipefail
cd ~/frappe-bench
source env/bin/activate

ensure_redis() {
  if ! redis-cli -p 11000 ping >/dev/null 2>&1; then
    redis-server config/redis_queue.conf --daemonize yes
  fi
  if ! redis-cli -p 13000 ping >/dev/null 2>&1; then
    redis-server config/redis_cache.conf --daemonize yes
  fi
}

echo "Scout dev bench — leave this window open. Ctrl+C to stop."
if [[ "${SCOUT_BENCH_FULL:-0}" == "1" ]]; then
  echo "Mode: full bench start (worker + watch). Worker Redis timeouts can stop the whole stack."
else
  echo "Mode: web + Redis only (stable for login/API). Export SCOUT_BENCH_FULL=1 for background jobs."
fi

while true; do
  ensure_redis
  if [[ "${SCOUT_BENCH_FULL:-0}" == "1" ]]; then
    fuser -k 8000/tcp 11000/tcp 13000/tcp 2>/dev/null || true
    sleep 1
    echo "[$(date -Iseconds)] bench start..."
    bench start || true
  else
    fuser -k 8000/tcp 2>/dev/null || true
    sleep 1
    echo "[$(date -Iseconds)] bench serve --noreload..."
    bench serve --port 8000 --noreload || true
  fi
  echo "[$(date -Iseconds)] Exited — restarting in 5s..."
  sleep 5
done
