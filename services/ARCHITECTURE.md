# Microservices boundaries (first cut)

```
                    ┌─────────────────┐
                    │  Next.js (UI)   │
                    └────────┬────────┘
                             │ /frappe proxy
                    ┌────────▼────────┐
                    │ Frappe (core)   │
                    │ Users, RBAC,    │
                    │ DocTypes, APIs  │
                    └───┬───┬───┬───┘
        ┌───────────────┘   │   └───────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌────────────────┐  ┌────────────────┐
│ integration   │  │ notification   │  │ payment        │
│ Moodle, TAO   │  │ Mailgun queue  │  │ Razorpay only  │
│ webhooks      │  │                │  │                │
└───────┬───────┘  └────────────────┘  └────────────────┘
        │
   Moodle / TAO (external)
```

## What stays in Frappe

- All MariaDB data and DocTypes
- Portal auth, student/company/TPO business rules
- Creating `Scout Payment Order`, applications, profiles
- Final webhook handlers that write assignment results (integration service only validates + forwards)

## What moved out

| Concern | Service | Frappe adapter |
|---------|---------|----------------|
| Moodle REST | integration | `scout.services.integration_client` |
| TAO webhook HMAC + retry forward | integration | Public URL on integration service |
| Outbound email | notification | `scout.utils.email` delegates when enabled |
| Razorpay HTTP | payment | `scout.api.payments.razorpay_util` delegates when enabled |

## Future

- Redis/RQ shared queue between Frappe and notification-service
- Payment service publishing `payment.paid` events to core
- Separate SMS provider in notification-service
