# VAL-TASK-MAR-047: Assignment API Helper Validation

```yaml
id: VAL-TASK-MAR-047
task: docs/intent/11_tasks/TASK-MAR-047-assignment-api-helper.md
status: production_verified
created: 2026-06-12
last_updated: 2026-06-12
environment: production
```

## Validation Plan

- Build frontend assets with `npm run build:frontend`.
- Run read-only journey smoke before deployment.
- Deploy from a clean detached worktree.
- Confirm Kubernetes serves the deployed image tag.
- Browser-check the assignment guard route after deployment.

## Evidence

- `npm run build:frontend` passed after extracting `frontend/src/api/assignmentMarathon.ts`.
- Built frontend emitted `public/assets/index-BDekEUsP.js` and preserved `public/assets/index-CqV-Tb1C.css`.
- Pre-deploy `npm run check:journey` passed catalog-independent assignment guard assertions, including `assignment-login-guard`, `assignment-status-error-submit-guard`, `assignment-content-submit-guard`, `step-error-state`, and `step-peer-empty-state`, before the expected `catalog-readiness` gate.
- Clean worktree deploy completed and Kubernetes rolled out `localhost:5000/marathon:76370b6`.
- `curl -I -H 'Cache-Control: no-cache' 'https://marathon.alfares.cz/steps/smoke-step?marathonerId=smoke-participant&qa=76370b6'` returned HTTP 200.
- Post-deploy `npm run check:journey` passed all catalog-independent frontend/read-only assertions and failed only at the expected `catalog-readiness` gate.
- Browser QA on `https://marathon.alfares.cz/steps/smoke-step?marathonerId=smoke-participant&qa=76370b6-browser` confirmed:
  - the assignment route renders a non-blank fallback state;
  - the not-found/profile fallback is visible for the smoke step;
  - no framework overlay is present;
  - no current-route warning/error console entries were captured.

## Result

Passed for TASK-MAR-047. Assignment page API calls are typed and centralized while preserving pre-catalog route guards.

Live assignment submission mutation proof remains blocked by missing approved catalog rows, assignment content, participant, and auth inputs.
