# VAL-TASK-MAR-045: Public API Helper Refactor Validation

```yaml
id: VAL-TASK-MAR-045
task: docs/intent/11_tasks/TASK-MAR-045-public-api-helper.md
status: production_verified
created: 2026-06-12
last_updated: 2026-06-12
environment: production
```

## Validation Plan

- Build frontend assets with `npm run build:frontend`.
- Run read-only journey smoke and confirm catalog-independent frontend checks still pass.
- Deploy from a clean detached worktree.
- Confirm Kubernetes serves the deployed image tag.
- Browser-check the language landing readiness state after deployment.

## Evidence

- `npm run build:frontend` passed after extracting `frontend/src/api/publicMarathon.ts`.
- Built frontend emitted `public/assets/index-BlvDxwOq.js` and preserved `public/assets/index-CqV-Tb1C.css`.
- `npm run check:journey` passed all frontend/read-only assertions, including `landing-how-readiness-state`, before the expected `catalog-readiness` blocker.
- Clean worktree deploy completed and Kubernetes rolled out `localhost:5000/marathon:d4e8d59`.
- `curl -I -H 'Cache-Control: no-cache' 'https://marathon.alfares.cz/en/?qa=d4e8d59'` returned HTTP 200.
- Post-deploy `npm run check:journey` passed all catalog-independent frontend/read-only assertions and failed only at the expected `catalog-readiness` gate.
- Browser QA on `https://marathon.alfares.cz/en/?qa=d4e8d59-browser#register` confirmed:
  - page title `English Marathon - registration status`;
  - closed registration copy is rendered;
  - missing launch gates are rendered;
  - readiness copy is rendered;
  - page is non-blank;
  - no framework overlay is present;
  - no current-route warning/error console entries were captured.
- Browser screenshot capture timed out twice in the in-app Browser runtime after DOM/console verification passed, so screenshot evidence is unavailable for this validation slice.

## Result

Passed for TASK-MAR-045. The refactor preserves the closed-catalog landing behavior while moving public Marathon landing data access behind shared typed helpers.

The broader production journey remains blocked by catalog readiness, not by this refactor.
