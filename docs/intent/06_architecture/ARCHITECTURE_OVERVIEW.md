# Marathon Architecture Overview

```yaml
id: MAR-ARCH-OVERVIEW
status: reviewed
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/04_systems/SYS-001-marathon-platform.md
downstream:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
related_adrs:
  - docs/intent/07_decisions/ADR-001-adopt-intent-preservation-system.md
  - docs/intent/07_decisions/ADR-002-catalog-only-loader.md
  - docs/intent/07_decisions/ADR-003-payment-attempt-ledger.md
  - docs/intent/07_decisions/ADR-004-plain-text-assignment-content.md
```

## Runtime Shape

- Backend: NestJS + TypeScript.
- Persistence: Prisma + PostgreSQL database `marathon`.
- Frontend: Vite + React + TypeScript, built into `public/` and served by NestJS.
- Deployment: Kubernetes namespace `statex-apps`.
- Domain: `https://marathon.alfares.cz`.
- API prefix: `/api/v1`.

## Integration Boundaries

| Boundary | Direction | Contract |
|---|---|---|
| auth-microservice | Marathon validates JWTs and loads user data. | JWT auth contract; profile display data. |
| payments-microservice | Marathon creates checkout and receives callbacks. | Product/order/payment callback contract plus callback API key. |
| notifications-microservice | Marathon sends participant notifications. | Notification request contract. |
| logging-microservice | Marathon emits structured logs. | Runtime logging contract. |
| PostgreSQL | Marathon stores catalog/progress/payment state. | Prisma schema and migrations. |

## Intent Preservation Implications

- Changes to runtime architecture require ADR updates.
- Changes to API, schema, payment callback, catalog loader, or readiness output require contract validation notes in the execution plan and validation report.
- Changes that touch participant data require sensitive-data classification and evidence.

## Validation

- Static/type/build checks appropriate to the changed files.
- `npm run check:readiness` for launch-readiness changes.
- `npm run check:journey` for public/auth/frontend flow changes.
- Kubernetes health and deploy smoke only after documentation and task validation pass.
