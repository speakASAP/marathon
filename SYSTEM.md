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
| GET | `/api/v1/me/marathons/:marathonerId/submissions/:stepId` | JWT | Read participant's saved submission/report for a step |
| POST | `/api/v1/me/marathons/:marathonerId/submissions` | JWT | Create/update participant step submission; tracks late penalty and bonus days |
| POST | `/api/v1/vip/checkout` | JWT | Create VIP checkout via payments-microservice |
| POST | `/api/v1/vip/gift-redemptions` | JWT | Redeem gift code and unlock VIP |
| POST | `/api/v1/payments/webhook` | X-API-Key | Payment callback from payments-microservice |
| GET | `/api/v1/winners` | None | Paginated winner leaderboard |
| GET | `/api/v1/winners/:id` | None | Winner detail with reviews |
| GET | `/api/v1/reviews` | None | Static testimonials |

## Current State
<!-- AI-maintained -->
Stage: active — core marathon, registration, steps, answers, me, submissions, VIP checkout/gift redemption, winners, and reviews modules operational. Frontend landing/profile surfaces were modernized and deployed on 2026-06-12 around the real registration, profile, VIP gate, gift-code, and assignment APIs. The frontend bootstrap now captures `marathon_token` before React route effects run, so portal login returns can authenticate direct visits to profile detail, gift redemption, and assignment pages instead of only `/profile`. Registration success now sends participants with an existing Marathon token directly to `/profile/:marathonerId` and sends unauthenticated participants through portal login with that exact profile return path, so newly created participants can be claimed before opening assignments, VIP checkout, or gift redemption. VIP checkout now calls payments-microservice with server-side product pricing, preserves `/profile/:marathonerId#vip-access` through portal login when checkout auth expires, and records every issued checkout in `MarathonPaymentAttempt`; payment callbacks validate `PAYMENT_WEBHOOK_API_KEY` and must match a recorded order, participant, product, amount, and currency before setting `isFree=false` and `paymentReported=true`. Gift redemption marks `MarathonGift.usedAt` while setting `MarathonParticipant.isFree=false` and `paymentReported=true`; the gift form requires profile participant context and a Marathon token before redemption, with sign-in preserving the exact participant return path. Authenticated profile detail can claim a newly registered participant when `userId` is still null, and profile payment-return states now explain `payment=success` callback settlement, already-confirmed VIP access, and cancelled checkout returns. Registration now requires a selected `languageCode` and refuses participant creation unless that active language catalog has a VIP product, unused gift code, steps, a non-trial post-gate step, and approved assignment content for every step; public `registrationOpen` now follows the same launch-ready contract so partial active catalog rows do not expose registration. The `/profile` dashboard renders marathon cards with progress, current step, VIP/payment state, bonus days, and continuation actions, and separates login-required from backend load-failure states with refresh/support actions. Profile detail distinguishes 404 not-found from backend load-failure states with refresh/support actions, and its schedule exposes the next active assignment, labels active/completed/late/locked/VIP-gated steps, shows due or saved timing, and links payment-blocked steps back to VIP options; the Step page can submit the participant's own report through `StepSubmission`, including late penalty report creation and bonus-day decrement. Assignment pages can now read the authenticated participant's saved report for the current step, restore it into the report form, and show saved status/bonus-day metadata before resubmission; the report form requires profile participant context and a Marathon token before submission, with sign-in preserving the exact step return path. Step assignment pages distinguish 404 not-found from assignment load failures with refresh/support actions, require approved plain-text `MarathonStep.assignmentContent` from the catalog, render it without HTML injection, and show an explicit configuration warning if missing; random peer reports are also generated/rendered as plain text to remove the previous `dangerouslySetInnerHTML` path. payments-microservice now has a `payments-marathon-integration` Kubernetes Secret and deployment env reference so callbacks for `applicationId=marathon` include Marathon's expected callback key. The root home page distinguishes readiness API load failures from closed-catalog state with refresh/support actions while keeping winners/reviews teasers optional. Language landing pages distinguish primary API/readiness load failures from closed-catalog fallback state with refresh/support actions, while treating the current 200 empty by-language response as no active catalog rather than an outage. Production currently has no active marathon rows/languages, so the landing renders a registration-not-open state until data is configured; root, shared navigation, language landing CTAs, landing VIP panel, and `/gift` page switch to registration/readiness/support wording instead of start/upgrade/gift redemption promises in that fallback state. Live registration/VIP/assignment flow verification still requires active Marathon/Product/Gift/Step data. On 2026-06-12 the legacy `speakasap-portal` exporter was checked and found to be intentionally removed: `marathon/management/commands/export_marathon_data.py` is now a stub saying the legacy DB is archived and export is not available. The historical exporter in git history exported participants, answers, and winners as well as catalog rows, so it must not be run as-is under the current no-bulk-progress-export rule. Direct Marathon full-export loader entrypoints (`scripts/load-marathon-export.js` and `scripts/load_marathon_export.py`) now refuse to run and point operators to the catalog-only loader. A create-only catalog loader now exists at `scripts/load-marathon-catalog.js`; it validates human-approved catalog JSON, rejects user/progress keys, dry-runs by default, requires `assignmentContent` for every step, and requires `--apply` to create Marathon/Product/Gift/Step rows. A read-only preflight now exists at `scripts/check-marathon-readiness.js` to verify active catalog rows, product pricing, unused gift codes, non-trial steps, approved assignment content, the payment-attempt ledger, and payment runtime configuration before live E2E verification; when run outside the pod and cluster DB is unreachable, it now emits a structured database-connection failure with the exact in-pod command and HTTP journey fallback. A guarded HTTP journey verifier now exists at `scripts/check-marathon-journey.js`; it checks public routes, direct login-return SPA shell routes for profile detail/assignment/gift, registration profile-login handoff, profile dashboard, profile-detail, assignment step, language landing, and home error states, checkout login handoff, assignment submit login guard, and gift redemption login guard in the built frontend bundle, and step assignment content read-only by default, can verify saved-submission read access for an existing authenticated participant with explicit IDs, verifies saved-submission readback after mutating submit smoke checks, and fails fast unless checkout/gift/submission smoke flags include explicit `--mutating` and authenticated inputs. The runtime Docker image copies `scripts/*.js` so these operational scripts are available inside the Marathon pod. Deploy now runs the readiness preflight as a non-blocking post-deploy phase so every rollout reports journey readiness separately from app health. Public catalog readiness is also exposed at `/api/v1/marathons/readiness` and used by the home/register/gift UI to explain registration-closed state without exposing secrets or participant data.

## Known Issues
<!-- AI-maintained -->
- P0: Production has no active Marathon rows/languages; public registration cannot open until an active `Marathon` is configured
- P0: Production has no active `MarathonProduct`/`MarathonGift`/`MarathonStep` data to verify VIP checkout, gift redemption, or assignment submission end-to-end; no `marathon_export.json` was found under `/home/ssf/Documents` on 2026-06-12
- P0: The current `speakasap-portal` checkout no longer contains usable legacy Marathon models or exporter code; approved catalog-only source data must be provided by a human/source-of-truth before loading `MarathonStep` title/sequence/formKey/assignmentContent through `npm run load:catalog -- <file> --apply`
- Winner records appear to be manually managed — no auto-detection on step completion

## Ops

```bash
kubectl get pods -n statex-apps -l app=marathon
kubectl logs -n statex-apps -l app=marathon --tail=100
./scripts/deploy.sh
```
