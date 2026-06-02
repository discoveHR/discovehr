# Scout Express — sidecar microservices

Frappe remains the **core** (users, RBAC, DocTypes, workflows). These services own cross-cutting integrations and can scale or deploy independently.

| Service | Port (dev) | Responsibility |
|---------|------------|----------------|
| **integration-service** | 8101 | Moodle LMS API, TAO/webhook ingress with retries |
| **notification-service** | 8102 | Email (Mailgun) / SMS hooks off the request path |
| **payment-service** | 8103 | Razorpay order create + signature verify |
| **search-service** (optional) | 7700 | Meilisearch — see [search-service/README.md](search-service/README.md) |

## Run locally

```bash
cd services
docker compose -f docker-compose.yml up --build
```

Or run each service manually:

```bash
cd services/integration-service && pip install -r requirements.txt && uvicorn main:app --port 8101
cd services/notification-service && pip install -r requirements.txt && uvicorn main:app --port 8102
cd services/payment-service && pip install -r requirements.txt && uvicorn main:app --port 8103
```

## Enable from Frappe (bench)

In `backend/.env` or bench `site_config.json`:

```env
SCOUT_USE_MICROSERVICES=1
SCOUT_INTEGRATION_SERVICE_URL=http://127.0.0.1:8101
SCOUT_NOTIFICATION_SERVICE_URL=http://127.0.0.1:8102
SCOUT_PAYMENT_SERVICE_URL=http://127.0.0.1:8103
SCOUT_SERVICE_INTERNAL_SECRET=change-me-in-production
```

Copy Mailgun / Razorpay / Moodle vars into `services/.env` (see `.env.example`).

When `SCOUT_USE_MICROSERVICES` is unset or `0`, Frappe uses the original in-process implementations (no behavior change for existing dev).

## Production notes

- Put services behind private network; only Frappe (and load balancer for webhooks) should call them.
- Point TAO webhooks to `integration-service` `/v1/webhooks/tao/psychometric` and `/v1/webhooks/tao/aptitude`; it validates HMAC and forwards to Frappe.
- Scale notification-service workers for queue depth; payment and integration are mostly stateless HTTP.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for boundaries and event flow.
