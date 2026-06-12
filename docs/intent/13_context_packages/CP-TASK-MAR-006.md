# CP-TASK-MAR-006: RunLayer Integration Context

```yaml
id: CP-TASK-MAR-006
status: active
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
```

## Files

- Marathon: `src/runlayer/*`, `src/app.module.ts`, `scripts/check-marathon-journey.js`
- RunLayer: `src/worker/task-router.service.ts`, `src/worker/task-router.service.spec.ts`
- Docs: `docs/intent/**/TASK-MAR-006*`, `SYSTEM.md`, `TASKS.md`, `STATE.json`

## Guardrails

- Read-only responses only.
- Aggregate metrics only.
- No participant engagement automation until catalog readiness and explicit operator-approved participant selection exist.
