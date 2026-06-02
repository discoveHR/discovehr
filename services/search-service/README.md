# Scout search service (optional Meilisearch)

When job volume is very large, configure Meilisearch for fast title/skills search. Without it, Scout uses MariaDB **FULLTEXT** (after `bench migrate`) and `LIKE` fallback.

## Quick start (Docker)

```bash
docker run -d --name scout-meili -p 7700:7700 \
  -e MEILI_MASTER_KEY=your-dev-master-key \
  getmeili/meilisearch:v1.11
```

Create index `scout_jobs` with filterable attribute `status` and searchable attributes `title`, `skills`.

## Backend env (`backend/.env`)

```env
SCOUT_MEILISEARCH_URL=http://127.0.0.1:7700
SCOUT_MEILISEARCH_API_KEY=your-dev-master-key
SCOUT_MEILISEARCH_JOBS_INDEX=scout_jobs
```

Active jobs are upserted on `Scout Job` save via a background worker when Meilisearch is configured.

## Student API

`list_student_jobs?q=python` uses Meilisearch → FULLTEXT → `LIKE` in that order.
