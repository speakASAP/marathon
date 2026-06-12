# VAL-TASK-MAR-042: Public Route Brand Consistency

```yaml
id: VAL-TASK-MAR-042
task: docs/intent/11_tasks/TASK-MAR-042-public-route-brand-consistency.md
status: pending
created: 2026-06-12
last_updated: 2026-06-12
environment: production
```

## Validation Plan

- Build frontend assets with `npm run build:frontend`.
- Run `npm run check:journey` and confirm `public-marathon-branding` passes with expanded language/static route markers.
- Deploy from a clean detached worktree.
- Confirm Kubernetes runs the deployed image tag.
- Browser-check `/en/`, `/about`, `/rules`, and `/winners` for Marathon-first route branding, no framework overlay, and no current-route console errors.

## Evidence

Pending.

## Result

Pending.
