# MariaDB Production Configuration

Copy this to `/etc/mysql/conf.d/scout.cnf` on the production server.
For local WSL dev, add to `/etc/mysql/mariadb.conf.d/` and restart: `sudo service mysql restart`.

```ini
[mysqld]
# ── Slow query logging (tune to 0.5s in prod) ─────────────────────────────
slow_query_log          = 1
slow_query_log_file     = /var/log/mysql/slow.log
long_query_time         = 0.5
log_queries_not_using_indexes = 1

# ── InnoDB buffer pool ─────────────────────────────────────────────────────
# Rule of thumb: 70-80% of available RAM on a dedicated DB server.
# Adjust to your hosting tier:
#   2 GB RAM  →  innodb_buffer_pool_size = 1G,  instances = 1
#   4 GB RAM  →  innodb_buffer_pool_size = 2G,  instances = 2
#   8 GB RAM  →  innodb_buffer_pool_size = 6G,  instances = 4 (current dev)
#  16 GB RAM  →  innodb_buffer_pool_size = 12G, instances = 8
innodb_buffer_pool_size      = 256M   # local dev minimum
innodb_buffer_pool_instances = 2

# ── Write performance ──────────────────────────────────────────────────────
# 2 = write to log, flush once per second (acceptable for app data, not banking)
innodb_flush_log_at_trx_commit = 2
innodb_log_file_size           = 128M

# ── Connection pool ────────────────────────────────────────────────────────
# Frappe uses gunicorn workers + a background worker pool.
# For 10 gunicorn workers + 4 background workers: 50 is safe.
max_connections    = 100
thread_cache_size  = 16

# ── Query cache — disable it (deprecated, hurts concurrent writes) ─────────
query_cache_type = 0
query_cache_size = 0

# ── Temp tables ────────────────────────────────────────────────────────────
tmp_table_size    = 64M
max_heap_table_size = 64M
```

## Scale estimates

| Students | Hosting | Buffer Pool | Connections | Notes |
|----------|---------|-------------|-------------|-------|
| < 5k | 2 vCPU / 2GB | 1G | 50 | Single server, Frappe + MariaDB colocated |
| 5k–20k | 4 vCPU / 4GB | 2G | 75 | Separate DB server recommended |
| 20k–50k | 8 vCPU / 8GB | 6G | 100 | Redis + Frappe workers tuned, read replicas considered |
| 50k+ | 16+ vCPU / 16GB+ | 12G+ | 150+ | Horizontal scaling, connection pooler (ProxySQL), read replicas |

## Key indexes already applied (run once, permanent)

All applied to `scout_localhost` on 2026-06-01:

| Table | Index | Columns | Query it optimises |
|-------|-------|---------|-------------------|
| Scout Psychometric Assignment | `student_user_idx` | `student_user` | Student's assignment list |
| Scout Aptitude Assignment | `student_user_idx` | `student_user` | Student's assignment list |
| Scout Psychometric Result | `assignment_idx` | `assignment` | Result lookup by assignment |
| Scout Aptitude Result | `assignment_idx` | `assignment` | Result lookup by assignment |
| Scout Portal Auth Token | `expires_at_idx` | `expires_at` | Token cleanup job |
| Scout Application | `student_job_idx` | `student_user, job_id` | "My applications" query |
| Scout TPO Profile | `tpo_user_idx` | `tpo_user` | Profile lookup per request |

## Checking for slow queries in production

```bash
# tail live slow queries
sudo tail -f /var/log/mysql/slow.log

# summarise with pt-query-digest (install percona toolkit)
sudo pt-query-digest /var/log/mysql/slow.log | head -100
```
