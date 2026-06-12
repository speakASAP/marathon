# System: marathon

## Architecture

NestJS + Prisma + PostgreSQL + Redis. Deployed on Kubernetes (`statex-apps` namespace).

- **Modules:** marathons, registrations, steps, answers, me (authenticated), submissions, VIP payments/gifts, winners, reviews
- **Frontend:** Vite + React + TypeScript in `frontend/`; production build output is `public/` and is served by NestJS
- **Port:** 3000
- **Domain:** marathon.alfares.cz
- **API prefix:** `/api/v1` (health and info excluded)

## External Integrations

| Service | URL | Usage |
|---------|-----|-------|
| auth-microservice | http://auth-microservice.statex-apps.svc.cluster.local:3370 | JWT validation; user name/avatar lookup for winner profiles |
| notifications-microservice | http://notifications-microservice.statex-apps.svc.cluster.local:3368 | Registration confirmation emails; participant notifications |
| logging-microservice | http://logging-microservice.statex-apps.svc.cluster.local:3367 | Centralized structured logging |
| payments-microservice | http://payments-microservice:3468 / https://payments.alfares.cz | VIP upgrade checkout and payment callbacks |
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
| POST | `/api/v1/me/marathons/:marathonerId/submissions` | JWT | Create/update participant step submission; tracks late penalty and bonus days |
| POST | `/api/v1/vip/checkout` | JWT | Create VIP checkout via payments-microservice |
| POST | `/api/v1/vip/gift-redemptions` | JWT | Redeem gift code and unlock VIP |
| POST | `/api/v1/payments/webhook` | X-API-Key | Payment callback from payments-microservice |
| GET | `/api/v1/winners` | None | Paginated winner leaderboard |
| GET | `/api/v1/winners/:id` | None | Winner detail with reviews |
| GET | `/api/v1/reviews` | None | Static testimonials |

## Current State
<!-- AI-maintained -->
Stage: active — core marathon, registration, steps, answers, me, submissions, VIP checkout/gift redemption, winners, and reviews modules operational. Frontend landing/profile surfaces were modernized and deployed on 2026-06-12 around the real registration, profile, VIP gate, gift-code, and assignment APIs. VIP checkout now calls payments-microservice with server-side product pricing, payment callbacks validate `PAYMENT_WEBHOOK_API_KEY`, and gift redemption marks `MarathonGift.usedAt` while setting `MarathonParticipant.isFree=false` and `paymentReported=true`. Authenticated profile detail can claim a newly registered participant when `userId` is still null. Profile schedule exposes the next active assignment, and the Step page can submit the participant's own report through `StepSubmission`, including late penalty report creation and bonus-day decrement. payments-microservice now has a `payments-marathon-integration` Kubernetes Secret and deployment env reference so callbacks for `applicationId=marathon` include Marathon's expected callback key. Production currently has no active marathon rows/languages, so the landing renders a registration-not-open state until data is configured; live registration/VIP/assignment flow verification still requires active Marathon/Product/Gift/Step data. On 2026-06-12 the legacy `speakasap-portal` exporter was checked and found to be intentionally removed: `marathon/management/commands/export_marathon_data.py` is now a stub saying the legacy DB is archived and export is not available. The historical exporter in git history exported participants, answers, and winners as well as catalog rows, so it must not be run as-is under the current no-bulk-progress-export rule.

## Known Issues
<!-- AI-maintained -->
- P0: Production has no active Marathon rows/languages; public registration cannot open until an active `Marathon` is configured
- P0: Production has no active `MarathonProduct`/`MarathonGift`/`MarathonStep` data to verify VIP checkout, gift redemption, or assignment submission end-to-end; no `marathon_export.json` was found under `/home/ssf/Documents` on 2026-06-12
- P0: The current `speakasap-portal` checkout no longer contains usable legacy Marathon models or exporter code; approved catalog-only source data must be provided by a human/source-of-truth before loading `MarathonStep` content
- Winner records appear to be manually managed — no auto-detection on step completion

## Ops

```bash
kubectl get pods -n statex-apps -l app=marathon
kubectl logs -n statex-apps -l app=marathon --tail=100
./scripts/deploy.sh
```
