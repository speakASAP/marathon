# ADR-006: RunLayer Read-Only Task Bridge

```yaml
id: ADR-006
status: reviewed
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/01_vision/VISION.md
```

## Context

Marathon Phase 5 requires RunLayer integration for AI task orchestration. The production catalog and participant journey are still blocked by missing approved catalog data, so automated engagement must not export participant lists or trigger reminders yet.

## Decision

Expose a read-only Marathon external task endpoint for RunLayer at `POST /api/v1/tasks/execute` and route `marathon:*` task types from RunLayer to that endpoint.

Initial supported task types:

- `marathon:readiness_report`
- `marathon:analytics_summary`
- `marathon:participant_engagement_plan`

## Consequences

- RunLayer can coordinate Marathon readiness and aggregate engagement planning.
- No participant identifiers, emails, reports, JWTs, gift codes, or survey comments are returned.
- Actual reminder sending remains a future task after catalog readiness and explicit operator selection.
