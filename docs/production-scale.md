# Scout Express — Production scale guide

For **~1,000 companies**, **~1,000 colleges**, and **lakhs of students**.

## Implemented in Scout app

| Feature | Purpose |
|---------|---------|
| **Scout College** | Canonical college record (`COL-#####`); links TPO + students via `scout_college` |
| **Scout TPO Rollup Stats** | Pre-aggregated counts per TPO (students, applications, training complete, invites) |
| **Scout Job Rollup Stats** | Application counts by status per job |
| **SQL student scope** | Union query + `scout_college` index (no fuzzy `LIKE`) |
| **Report pagination** | 100 students per page; async CSV for 800+ students |
| **Student search API** | `scout.api.search.search_tpo_students` (scoped, indexed columns) |
| **FULLTEXT index** | Optional on `full_name`, `email`, `roll_number` (MariaDB, via migrate) |

## Deploy checklist

```bash
cd ~/frappe-bench
bench --site YOUR_SITE migrate
bench worker --queue short,long
```

Enable **Redis** for cache (required for scope cache, exports, rollups).

### Scheduler

Rollups refresh every **15 minutes** (`hooks.py` cron). Ensure scheduler is running:

```bash
bench enable-scheduler
# or bench start includes scheduler
```

## Read replica (MariaDB)

Use a **read replica** for heavy read endpoints (reports, exports, admin analytics) without changing app code initially:

1. Configure MariaDB replication (primary → replica).
2. In `site_config.json`, Frappe does not split reads by default. Options:
   - **ProxySQL** or **MariaDB MaxScale** route `SELECT` to replica.
   - **Custom report worker** on a separate bench site pointed at replica (read-only DB user).
3. Keep writes (login, applications, bulk upload) on primary only.

Recommended first step: run **long-queue workers** on a small second VM that uses replica connection string for `get_tpo_report` / exports only (future env flag `SCOUT_READ_DB_HOST`).

## Elasticsearch / OpenSearch (optional)

When `LIKE %query%` search is too slow (>500k profiles):

1. Deploy OpenSearch cluster (3 nodes minimum in production).
2. Index documents: `student_user`, `full_name`, `email`, `scout_college`, `branch`, `batch`.
3. Sync on `Scout Student Profile` save via `frappe.enqueue` indexer.
4. Replace `search_tpo_students` SQL with OpenSearch query filtered by TPO `scout_college` id.

Until then, use the built-in scoped SQL search (2+ characters, limit 50).

## Capacity targets

| Metric | Target with current stack |
|--------|---------------------------|
| TPO dashboard home | &lt;200ms (rollup DocType) |
| Student list page | &lt;500ms (paginated SQL) |
| Report page | &lt;1s per 100 students |
| Full CSV export | Background queue (not web worker) |

## Monitoring

- Slow query log: queries &gt; 2s on `tabScout Application`, `tabScout Student Profile`
- Redis memory and eviction policy
- RQ queue depth: `bench doctor` / Redis `LLEN` on `long` queue
