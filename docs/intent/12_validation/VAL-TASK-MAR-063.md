# VAL-TASK-MAR-063: Post-Deploy User Flow Smoke Validation

## Validation Summary

Post-deploy user-flow smoke coverage was added for public traversal, new-user registration, and VIP checkout entry protection.

## Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| User-flow script syntax | Pass | `node --check scripts/check-marathon-user-flows.js` completed successfully. |
| Existing journey script syntax | Pass | `node --check scripts/check-marathon-journey.js` completed successfully. |
| Production smoke script syntax | Pass | `node --check scripts/run-production-smoke-safe.js` completed successfully. |
| Deploy script syntax | Pass | `bash -n scripts/deploy.sh` completed successfully. |
| Package script wiring | Pass | `npm run check:user-flows -- --base-url https://marathon.alfares.cz --json` completed successfully with network access. |
| Existing journey smoke | Pass | `npm run check:journey -- --base-url https://marathon.alfares.cz --json` completed successfully after relaxing stale closed-catalog bundle marker checks for the live open-catalog production state. |
| Public route traversal | Pass | `check:user-flows` served 17 production routes without HTTP errors. |
| Registration attempt | Pass | `check:user-flows` created a generated `example.invalid` registration and verified profile handoff. |
| Checkout boundary | Pass | `check:user-flows` verified unauthenticated checkout returns HTTP 401; authenticated basket creation remains available when a smoke token is supplied. |
| Remote deploy | Pass | `./scripts/deploy.sh 0cc1803` completed successfully on `alfares`, deploying `localhost:5000/marathon:0cc1803`. |
| Post-deploy readiness | Pass | In-pod `npm run check:readiness` reported ready catalog, payment, gift, and assignment state. |
| Post-deploy user flow | Pass | In-pod `npm run check:user-flows` used `MARATHON_BASE_URL=http://127.0.0.1:3000`, served 17 routes, registered a smoke user, and verified checkout auth gate. |
| Post-deploy production smoke | Pass | In-pod `npm run check:production-smoke` completed payment unlock, gift unlock, 29 submissions, winner creation, and NPS create/update. |

## Sensitive Data Handling

The validation evidence records only masked smoke email, masked participant ID, route count, and check names. No JWTs, payment keys, gift-code values, card data, or full participant identifiers are recorded.

## Residual Risk

The strict post-deploy smoke is dependency-light and validates SPA routes, user-flow APIs, and frontend action markers rather than executing a real browser click session. Full browser click automation can be added later if the deployment runtime receives an approved headless browser dependency.
