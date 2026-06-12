# FEAT-003: RunLayer Orchestration

```yaml
id: FEAT-003
status: active
owner: Product
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/01_vision/VISION.md
```

## Intent

Register Marathon with RunLayer so launch readiness, analytics, and future participant engagement work can be coordinated through the ecosystem control plane.

## Scope

- Register Marathon as a RunLayer project.
- Route `marathon:*` RunLayer task types to Marathon.
- Provide safe read-only external task execution.
- Define aggregate-only participant engagement task planning.

## Non-Goals

- Do not send participant reminders in this slice.
- Do not export participant lists or private progress.
- Do not bypass catalog readiness.

## Success Criteria

- RunLayer can route `marathon:*` tasks to Marathon.
- Marathon returns valid `{ output_ref }` for supported task types.
- Journey smoke covers the external task endpoint.
- RunLayer has an idempotent Marathon project registration.
