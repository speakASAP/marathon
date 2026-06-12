# VAL-TASK-MAR-041: Public Marathon Branding

```yaml
id: VAL-TASK-MAR-041
task: docs/intent/11_tasks/TASK-MAR-041-public-marathon-branding.md
status: pending
created: 2026-06-12
last_updated: 2026-06-12
environment: production
```

## Validation Plan

- Build frontend assets with `npm run build:frontend`.
- Run `npm run check:journey` and confirm `public-marathon-branding` passes.
- Deploy from a clean detached worktree.
- Confirm Kubernetes runs the deployed image tag.
- Browser-check `/` and `/register` for Marathon-first brand markers, no framework overlay, and no current-route console errors.

## Evidence

Pending.

## Result

Pending.
