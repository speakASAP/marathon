# System: marathon

## Architecture

NestJS + Prisma + PostgreSQL + Redis. Deployed on Kubernetes (`statex-apps` namespace). Blue/green deployment via `./scripts/deploy.sh`.

- **Modules:** marathons, registrations, steps, answers, me (authenticated), winners, reviews
- **Port:** 3000
- **Domain:** marathon.alfares.cz
- **API prefix:** `/api/v1` (health and info excluded)

## External Integrations

| Service | URL | Usage |
|---------|-----|-------|
| auth-microservice | http://auth-microservice.statex-apps.svc.cluster.local:3370 | JWT validation; user name/avatar lookup for winner profiles |
| notifications-microservice | http://notifications-microservice.statex-apps.svc.cluster.local:3368 | Registration confirmation emails; participant notifications |
| logging-microservice | http://logging-microservice.statex-apps.svc.cluster.local:3367 | Centralized structured logging |
| payments-microservice | https://payments.alfares.cz (`:3468`) | VIP upgrade payments (not yet wired — see PLAN.md T1/T2) |
| database-server | db-server-postgres:5432 | PostgreSQL — database `marathon` |

## Key API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check |
| GET | `/api/v1/marathons` | None | List marathons |
| GET | `/api/v1/marathons/languages` | None | Available language codes |
| GET | `/api/v1/marathons/by-language/:code` | None | Active marathon for a language |
| GET | `/api/v1/marathons/:id` | None | Marathon by ID |
| POST | `/api/v1/registrations` | None | Register participant |
| GET | `/api/v1/steps?marathonId=` | None | List steps for a marathon |
| GET | `/api/v1/steps/:id` | None | Step detail |
| GET | `/api/v1/answers/random?stepId=` | None | Random peer answer for a step |
| GET | `/api/v1/me/marathons` | JWT | Authenticated user's marathons |
| GET | `/api/v1/me/marathons/:marathonerId` | JWT | Participant detail |
| GET | `/api/v1/winners` | None | Paginated winner leaderboard |
| GET | `/api/v1/winners/:id` | None | Winner detail with reviews |
| GET | `/api/v1/reviews` | None | Static testimonials |

## Current State
<!-- AI-maintained -->
Stage: active — core marathon, registration, steps, answers, me, winners, and reviews modules operational. VIP payment flow and gift code redemption not yet implemented (see PLAN.md Phase 1).

## Known Issues
<!-- AI-maintained -->
- P0: VIP upgrade payment flow not wired to payments-microservice (PLAN.md T1/T2)
- P1: Gift code redemption endpoint not implemented (PLAN.md T3)
- Winner records appear to be manually managed — no auto-detection on step completion

## Ops

```bash
kubectl get pods -n statex-apps -l app=marathon
kubectl logs -n statex-apps -l app=marathon --tail=100
./scripts/deploy.sh
```
