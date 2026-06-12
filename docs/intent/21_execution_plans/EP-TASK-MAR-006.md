# EP-TASK-MAR-006: RunLayer Read-Only Integration

```yaml
id: EP-TASK-MAR-006
status: active
source_task: docs/intent/11_tasks/TASK-MAR-006-runlayer-readonly-integration.md
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
```

## Traceability

- Vision: production-ready Marathon operation.
- Feature: `FEAT-003`.
- ADR: `ADR-006`.

## Implementation Steps

1. Add Marathon RunLayer controller/service/module.
2. Return only aggregate/readiness data in `{ output_ref }`.
3. Extend journey smoke with RunLayer task checks.
4. Add `marathon` prefix to RunLayer `TaskRouterService`.
5. Register `marathon` project idempotently in RunLayer production DB.
6. Build/deploy Marathon and RunLayer.
7. Verify live Marathon endpoint, RunLayer-to-Marathon network call, project registration, and journey smoke.

## Contract Validation

- Marathon accepts RunLayer request shape: `task_id`, `type`, `payload_ref`, `acceptance_criteria`.
- Marathon returns RunLayer response shape: `{ output_ref: object }`.
- RunLayer routes `marathon:*` to `http://marathon:3000/api/v1/tasks/execute`.

## Replay/Determinism

Supported task types are read-only and deterministic for the current database state. Project registration uses `ON CONFLICT DO NOTHING` or an equivalent idempotent check.

## Sensitive-Data Handling

No task response may contain participant identifiers, emails, report text, JWTs, payment secrets, full gift codes, or survey comments.

## Validation

- Marathon `npm run build`.
- RunLayer `npm run build`.
- RunLayer task-router unit test.
- Deployed Marathon `/api/v1/tasks/execute` smoke.
- Deployed RunLayer pod calls Marathon service URL.
- Marathon `npm run check:journey`.
