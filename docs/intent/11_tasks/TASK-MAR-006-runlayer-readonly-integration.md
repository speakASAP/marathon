# TASK-MAR-006: Add RunLayer Read-Only Integration

```yaml
id: TASK-MAR-006
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/10_features/FEAT-003-runlayer-orchestration.md
goal_impact:
  - docs/intent/22_goal_impact/GOAL-IMPACT-TASK-MAR-006.md
execution_plan:
  - docs/intent/21_execution_plans/EP-TASK-MAR-006.md
```

## Objective

Connect Marathon to RunLayer through read-only task execution and register Marathon as a RunLayer project without exposing participant-private data.

## Scope

- Add Marathon `POST /api/v1/tasks/execute`.
- Add RunLayer `marathon` service-prefix route.
- Register project slug `marathon` in RunLayer if missing.
- Update journey smoke and validation evidence.

## Sensitive-Data Classification

Sensitive. The integration must return aggregate-only data and must not include participant identifiers, emails, reports, JWTs, payment secrets, full gift codes, or NPS comments.

## Acceptance Criteria

- [x] Marathon external task endpoint returns `{ output_ref }` for supported task types.
- [x] Unsupported Marathon task types are rejected.
- [x] RunLayer routes `marathon:*` to Marathon.
- [x] RunLayer project `marathon` exists with repo reference.
- [x] Build, deploy, and smoke validation pass except known catalog gate.

## Validation Summary

`VAL-TASK-MAR-006` verifies the Marathon task endpoint, RunLayer route, project registration, build/deploy evidence, and journey-smoke coverage. This read-only integration is complete even though final Marathon registration/payment/assignment launch remains catalog-blocked.
