# VAL-TASK-MAR-063: Post-Deploy User Flow Smoke Validation

## Validation Summary

Post-deploy user-flow smoke coverage was added for public traversal, new-user registration, VIP checkout entry protection, payment return routes, dashboard payment/action markers, and optional authenticated dashboard API checks.

## Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| User-flow script syntax | Pass | `node --check scripts/check-marathon-user-flows.js` completed successfully. |
| Existing journey script syntax | Pass | `node --check scripts/check-marathon-journey.js` completed successfully. |
| Production smoke script syntax | Pass | `node --check scripts/run-production-smoke-safe.js` completed successfully. |
| Deploy script syntax | Pass | `bash -n scripts/deploy.sh` completed successfully. |
| Package script wiring | Pass | `npm run check:user-flows -- --base-url https://marathon.alfares.cz --json` completed successfully with network access on 2026-06-21. |
| Existing journey smoke | Pass | `npm run check:journey -- --base-url https://marathon.alfares.cz --json` completed successfully on 2026-06-21 with readiness, checkout return UI, progress report UI, NPS UI, and assignment content checks passing. |
| Public route traversal | Pass | `check:user-flows` served 17 production routes without HTTP errors. |
| Dashboard and payment-return contract | Pass | `check:user-flows` verified dashboard bundle markers for payment success/cancel states, VIP checkout actions, current assignment actions, progress report actions, and feedback actions. |
| Registration attempt | Pass | `check:user-flows` created a generated `example.invalid` registration and verified profile handoff plus `/profile/:id?payment=success` and `/profile/:id?payment=cancelled` return routes. |
| Checkout boundary | Pass | `check:user-flows` verified unauthenticated checkout returns HTTP 401; authenticated basket creation remains available when a smoke token is supplied and now asserts provider redirects do not point back to Marathon. |
| Authenticated dashboard extension | Pass with gated input | `check:user-flows` now verifies `GET /api/v1/me/marathons/:id`, current-step route serving, and progress-report API when `MARATHON_SMOKE_AUTH_TOKEN` or `--auth-token` is supplied; the 2026-06-21 public run skipped this branch because no smoke token was provided. |
| Remote deploy | Pass | User-approved `./scripts/deploy.sh` completed successfully on `alfares` on 2026-06-21, deploying `localhost:5000/marathon:59e88d8` in `statex-apps`. |
| Post-deploy readiness | Pass | In-pod `npm run check:readiness` reported ready catalog, payment, gift, and assignment state. |
| Post-deploy user flow | Pass | In-pod `npm run check:user-flows` used `MARATHON_BASE_URL=http://127.0.0.1:3000`, served 17 routes, registered a smoke user, verified payment return routes, dashboard/payment action markers, and checkout auth gate. |
| Post-deploy production smoke | Pass | In-pod `npm run check:production-smoke` completed payment unlock, gift unlock, 29 submissions, winner creation, and NPS create/update after the `59e88d8` rollout. |
| Live production-safe payment/dashboard smoke | Pass | 2026-06-21 in-pod `npm run check:production-smoke` returned `ok=true`, payment unlock status `vip_unlocked`, profile type `vip`, payment ledger status `confirmed`, 29 submitted steps, finished participant, winner row, and NPS create/update with masked evidence only. |

## Sensitive Data Handling

The validation evidence records only masked smoke email, masked participant/order/gift/winner IDs, route count, aggregate counts, and check names. No JWTs, payment keys, webhook keys, gift-code values, card data, full participant identifiers, or private report text are recorded.

## Residual Risk

The strict post-deploy smoke is dependency-light and validates SPA routes, user-flow APIs, payment return routes, and frontend action markers rather than executing a real browser click session. Full browser click automation can be added later if the deployment runtime receives an approved headless browser dependency. Authenticated checkout/dashboard API assertions require a supplied smoke token and are skipped in public unauthenticated runs.
