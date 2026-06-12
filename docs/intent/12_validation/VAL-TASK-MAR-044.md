# VAL-TASK-MAR-044: Closed-Catalog How Section Gate

```yaml
id: VAL-TASK-MAR-044
task: docs/intent/11_tasks/TASK-MAR-044-closed-catalog-how-gate.md
status: pending
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

Pending.

## Result

Pending.
