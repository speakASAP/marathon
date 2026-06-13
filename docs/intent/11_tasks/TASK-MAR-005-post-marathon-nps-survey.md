# TASK-MAR-005: Add Post-Marathon NPS Survey

```yaml
id: TASK-MAR-005
status: complete
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/intent/10_features/FEAT-002-post-marathon-nps-flow.md
goal_impact:
  - docs/intent/22_goal_impact/GOAL-IMPACT-TASK-MAR-005.md
execution_plan:
  - docs/intent/21_execution_plans/EP-TASK-MAR-005.md
```

## Objective

Implement a private post-marathon NPS survey and aggregate analytics without relying on catalog data or exposing participant comments.

## Scope

- Add a persisted NPS response tied one-to-one to `MarathonParticipant`.
- Add authenticated participant-owned submit endpoint.
- Show survey UI only after the marathon is finished.
- Add aggregate NPS metrics to operational analytics and support dashboard.
- Add smoke coverage for auth guard and frontend bundle presence.

## Non-Goals

- Do not publish participant comments as reviews.
- Do not send notifications in this slice.
- Do not bypass catalog readiness or mark final launch verified.

## Acceptance Criteria

- [x] Schema and migration support one response per participant.
- [x] Unauthenticated survey submission returns 401.
- [x] Incomplete participant submissions are rejected by source guard.
- [x] Finished participant can create/update their own survey response in production.
- [x] `/api/v1/marathons/analytics` includes aggregate survey metrics only.
- [x] `/support` renders aggregate NPS metrics.
- [x] Documentation and validation evidence are updated.

## Current Status

Complete. Production-safe synthetic smoke created a finished participant, submitted NPS score 10, updated the same participant response to score 9, and verified exactly one survey row for that participant. Smoke data remains excluded from public analytics and winners, and notification storage has no Marathon/smoke outbound rows. Evidence is recorded in `VAL-TASK-MAR-005`.
