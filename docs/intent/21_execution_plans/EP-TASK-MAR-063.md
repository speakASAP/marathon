# EP-TASK-MAR-063: Post-Deploy User Flow Smoke

## Scope

Implement a Node-based smoke verifier that runs without additional browser/runtime dependencies and validates user-visible Marathon journeys through HTTP, SPA route serving, API calls, and frontend bundle action markers.

## Files

- `scripts/check-marathon-user-flows.js`
- `scripts/deploy.sh`
- `package.json`
- `docs/intent/11_tasks/TASK-MAR-063-post-deploy-user-flow-smoke.md`
- `docs/intent/12_validation/VAL-TASK-MAR-063.md`

## Implementation Steps

1. Add a user-flow smoke script with route traversal, registration attempt, and checkout boundary checks.
2. Add npm scripts for `check:user-flows` and `check:production-smoke`.
3. Run `check:user-flows` as a strict post-deploy phase.
4. Run `check:production-smoke` as a guarded post-deploy phase because it depends on production secrets and approved catalog/payment state.

## Safety

- Smoke registration uses generated `example.invalid` email by default.
- Reported email, participant ID, and order ID values are masked.
- No payment card data is submitted.
- Authenticated checkout requires an explicit smoke token.

## Validation

- `node --check scripts/check-marathon-user-flows.js`
- `node --check scripts/check-marathon-journey.js`
- `node --check scripts/run-production-smoke-safe.js`
- `bash -n scripts/deploy.sh`
- Production URL smoke: `node scripts/check-marathon-user-flows.js --base-url https://marathon.alfares.cz --json`
