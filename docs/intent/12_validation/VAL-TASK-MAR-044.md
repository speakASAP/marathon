# VAL-TASK-MAR-044: Closed-Catalog How Section Gate

```yaml
id: VAL-TASK-MAR-044
task: docs/intent/11_tasks/TASK-MAR-044-closed-catalog-how-gate.md
status: production_verified
created: 2026-06-12
last_updated: 2026-06-12
environment: production
```

## Validation Plan

- Build frontend assets with `npm run build:frontend`.
- Run `npm run check:journey` and confirm `landing-how-readiness-state` passes.
- Deploy from a clean detached worktree.
- Confirm Kubernetes runs the deployed image tag.
- Browser-check `/en/#how` for launch-readiness copy, absence of live workflow claims, no framework overlay, and no current-route console errors.

## Evidence

- `npm run build:frontend` completed before commit `521d17e`, generating `public/assets/index-KSOlryzn.js` and preserving the current CSS asset.
- Clean worktree deploy completed and Kubernetes rolled out `localhost:5000/marathon:521d17e`.
- `curl -I -H 'Cache-Control: no-cache' 'https://marathon.alfares.cz/en/?qa=521d17e'` returned HTTP 200.
- `npm run check:journey` passed `landing-how-readiness-state`.
- The same smoke run failed only at `catalog-readiness`, with zero active marathon/product/gift/step rows still blocking mutating registration/payment/assignment verification.
- Browser QA on `https://marathon.alfares.cz/en/?qa=521d17e-browser#how` confirmed:
  - page title `English Marathon - registration status`;
  - section text includes `How launch opens`, `Approve catalog`, `Verify readiness`, and `Run journey smoke`;
  - section text excludes `Daily assignment`, `Personal feedback`, and `Track progress`;
  - page is non-blank;
  - no framework overlay is present;
  - no current-route warning/error console entries were captured.
- Screenshot evidence: `/private/tmp/marathon-how-gate-521d17e.png`.

## Result

Passed for TASK-MAR-044. The closed-catalog language landing no longer presents live participant workflow claims before approved catalog data exists.

The broader production journey remains blocked by catalog readiness, not by this frontend gate.
