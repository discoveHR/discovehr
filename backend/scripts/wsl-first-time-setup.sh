#!/usr/bin/env bash
# First-time Frappe bench setup for scout.localhost on Ubuntu 22.04 WSL2.
# Run as: bash /mnt/c/Users/admin/Documents/discovehr/backend/scripts/wsl-first-time-setup.sh
set -euo pipefail

BENCH_ROOT="$HOME/frappe-bench"
SITE="scout.localhost"
SCOUT_REPO="/mnt/c/Users/admin/Documents/discovehr"
LOG="$HOME/scout-setup.log"

log() { echo "$(date '+%H:%M:%S') $*" | tee -a "$LOG"; }

log "=== Scout Express first-time WSL setup ==="
log "Bench: $BENCH_ROOT  Site: $SITE  Repo: $SCOUT_REPO"
echo ""

# ─── 1. System packages ───────────────────────────────────────────────────────
log "Step 1/9: Updating apt packages..."
sudo apt-get update -qq 2>&1 | tail -2

log "Step 1/9: Installing system dependencies..."
sudo apt-get install -y -qq \
    python3-pip python3-dev python3-setuptools python3-venv \
    git curl wget unzip \
    redis-server \
    software-properties-common \
    libmysqlclient-dev default-libmysqlclient-dev \
    libssl-dev libffi-dev \
    fonts-liberation xfonts-75dpi xfonts-base \
    2>&1 | tail -3
log "System packages installed."

# ─── 2. MariaDB ───────────────────────────────────────────────────────────────
log "Step 2/9: Installing MariaDB..."
sudo apt-get install -y -qq mariadb-server mariadb-client 2>&1 | tail -3

# Start MariaDB (works with or without systemd)
sudo service mariadb start 2>&1 | tail -2 || sudo mysqld_safe --daemonize 2>/dev/null &
sleep 3

log "Step 2/9: Configuring MariaDB charset for Frappe..."
sudo tee /etc/mysql/mariadb.conf.d/99-frappe.cnf > /dev/null <<'MYCNF'
[mysqld]
character-set-client-handshake = FALSE
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
innodb_file_format = Barracuda
innodb_file_per_table = 1
innodb_large_prefix = 1

[mysql]
default-character-set = utf8mb4
MYCNF

# Switch root to password auth so bench new-site can connect
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY ''; FLUSH PRIVILEGES;" 2>/dev/null \
    || sudo mysql -e "UPDATE mysql.global_priv SET priv=json_set(priv, '$.plugin', 'mysql_native_password', '$.authentication_string', '') WHERE User='root' AND Host='localhost'; FLUSH PRIVILEGES;" 2>/dev/null \
    || true

sudo service mariadb restart 2>&1 | tail -1
log "MariaDB ready."

# ─── 3. Redis ─────────────────────────────────────────────────────────────────
log "Step 3/9: Starting Redis..."
sudo service redis-server start 2>&1 | tail -1 || true
redis-cli ping && log "Redis ready." || log "WARNING: Redis ping failed, bench will start its own."

# ─── 4. Node.js 18 + yarn ─────────────────────────────────────────────────────
log "Step 4/9: Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - 2>&1 | tail -5
sudo apt-get install -y -qq nodejs 2>&1 | tail -2
sudo npm install -g yarn 2>&1 | tail -2
log "Node $(node -v)  npm $(npm -v)  yarn $(yarn -v) ready."

# ─── 5. wkhtmltopdf ───────────────────────────────────────────────────────────
log "Step 5/9: Installing wkhtmltopdf..."
sudo apt-get install -y -qq wkhtmltopdf 2>&1 | tail -2
log "wkhtmltopdf ready."

# ─── 6. frappe-bench CLI ──────────────────────────────────────────────────────
log "Step 6/9: Installing frappe-bench via pip..."
pip3 install --user frappe-bench 2>&1 | tail -3
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
bench --version
log "frappe-bench CLI ready."

# ─── 7. bench init ────────────────────────────────────────────────────────────
if [[ -d "$BENCH_ROOT" ]]; then
    log "Step 7/9: bench dir already exists at $BENCH_ROOT — skipping bench init."
else
    log "Step 7/9: Running bench init (downloads Frappe v15, ~3-5 min)..."
    cd ~
    bench init --frappe-branch version-15 --python python3 frappe-bench 2>&1 | tee -a "$LOG"
    log "bench init complete."
fi
cd "$BENCH_ROOT"

# ─── 8. Create site ───────────────────────────────────────────────────────────
if bench --site "$SITE" version 2>/dev/null | grep -q scout; then
    log "Step 8/9: Site $SITE already has scout installed — skipping."
elif [[ -d "sites/$SITE" ]]; then
    log "Step 8/9: Site $SITE exists. Linking and installing scout app..."
    ln -sfn "$SCOUT_REPO/backend/apps/scout" apps/scout
    bench --site "$SITE" install-app scout 2>&1 | tee -a "$LOG"
else
    log "Step 8/9: Creating site $SITE (takes 1-3 min)..."
    bench new-site "$SITE" \
        --mariadb-root-password "" \
        --admin-password "Admin@123" \
        --db-name scout_dev \
        --no-mariadb-socket \
        2>&1 | tee -a "$LOG"
    log "Site created. Linking and installing scout app..."
    ln -sfn "$SCOUT_REPO/backend/apps/scout" apps/scout
    bench --site "$SITE" install-app scout 2>&1 | tee -a "$LOG"
fi

# ─── 9. Copy .env and migrate ────────────────────────────────────────────────
log "Step 9/9: Copying .env and running migrate..."
if [[ -f "$SCOUT_REPO/backend/.env" ]]; then
    cp -f "$SCOUT_REPO/backend/.env" "$BENCH_ROOT/.env"
    log "Copied backend/.env"
elif [[ -f "$SCOUT_REPO/backend/.env.example" ]]; then
    cp -f "$SCOUT_REPO/backend/.env.example" "$BENCH_ROOT/.env"
    log "Copied backend/.env.example as .env"
fi

bench --site "$SITE" migrate 2>&1 | tail -10 | tee -a "$LOG"
bench --site "$SITE" clear-cache 2>&1 | tee -a "$LOG"

log "=== Setup complete! ==="
log "Log saved to: $LOG"
echo ""
echo "Now starting bench..."
echo ""
bash "/mnt/c/Users/admin/Documents/discovehr/backend/scripts/bench-dev-loop.sh"
