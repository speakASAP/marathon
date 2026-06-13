# VAL-TASK-MAR-050: Registration and Gift Action API Helper Validation

```yaml
id: VAL-TASK-MAR-050
task: docs/intent/11_tasks/TASK-MAR-050-registration-gift-api-helper.md
status: production_verified
created: 2026-06-13
last_updated: 2026-06-13
environment: production
```

## Validation Plan

- Build frontend assets with `npm run build:frontend`.
- Run read-only journey smoke before deployment.
- Deploy from a clean detached worktree after commit.
- Confirm Kubernetes serves the deployed image tag.
- Browser-check registration and gift closed-catalog guard routes after deployment.

## Evidence

- `npm run build:frontend` passed after adding `frontend/src/api/journeyMarathon.ts` and refactoring `RegistrationForm.tsx` plus `Gift.tsx`.
- Built frontend emitted `public/assets/index-CRQaY7qP.js` and preserved `public/assets/index-CqV-Tb1C.css`.
- Pre-deploy and post-deploy `npm run check:journey` passed catalog-independent registration and gift assertions, including `registration-login-handoff`, `registration-auth-binding-ui`, `gift-login-guard`, `gift-readiness-error-state`, `gift-readiness-loading-state`, and `gift-missing-gates-ui`, before the expected `catalog-readiness` gate.
- Clean detached worktree deployment completed for commit `0cb03c0`; Kubernetes served image `localhost:5000/marathon:0cb03c0`.
- `curl -I -H 'Cache-Control: no-cache' 'https://marathon.alfares.cz/register?qa=0cb03c0'` returned HTTP 200.
- `curl -I -H 'Cache-Control: no-cache' 'https://marathon.alfares.cz/gift?marathonerId=smoke-participant&qa=0cb03c0'` returned HTTP 200.
- Browser QA on `/register?qa=0cb03c0-register-only` loaded `index-CRQaY7qP.js`, rendered `Регистрация на марафон` with the closed registration panel and exact missing launch gates, had no framework overlay, and produced no route-relevant console warnings/errors.
- Browser QA on `/gift?marathonerId=smoke-participant&qa=0cb03c0-browser` loaded `index-CRQaY7qP.js`, rendered the gift-not-ready panel and exact missing launch gates, had no framework overlay, and produced no route-relevant console warnings/errors.

## Result

Passed for TASK-MAR-050. Registration and gift redemption action calls now use a typed journey API helper and are verified on production for catalog-independent guarded states.

Live registration and gift mutation proof remains blocked until approved catalog data, an unused gift code, and authenticated test participant inputs are available.
