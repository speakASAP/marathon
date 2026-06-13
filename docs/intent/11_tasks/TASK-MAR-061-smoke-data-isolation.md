# TASK-MAR-061: Isolate Production Smoke Data

```yaml
id: TASK-MAR-061
status: complete
owner: Engineering
created: 2026-06-13
completed: 2026-06-13
completeness_level: complete
upstream:
  - docs/intent/01_vision/VISION.md
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
  - docs/intent/11_tasks/TASK-MAR-004-verify-end-to-end-vip-flow.md
  - docs/intent/12_validation/VAL-TASK-MAR-004.md
goal_impact: docs/intent/22_goal_impact/GOAL-IMPACT-TASK-MAR-061.md
execution_plan: docs/intent/21_execution_plans/EP-TASK-MAR-061.md
context_package: docs/intent/13_context_packages/CP-TASK-MAR-061.md
validation: docs/intent/12_validation/VAL-TASK-MAR-061.md
sensitive_data: synthetic-only; do not print JWTs, gift codes, emails, payment secrets, or report payloads
contract_impact: public analytics and winners exclude synthetic smoke records
replay_impact: production smoke runner must be unique, guarded, and restore gift readiness
```

## Purpose

Production smoke verified gift redemption, winner creation, and finished-participant NPS with a synthetic participant. The synthetic rows must not pollute participant-facing winner surfaces or operational analytics.

## Acceptance Criteria

- Smoke participants are excluded from aggregate analytics where user-facing/business metrics are reported.
- Public winners list and winner detail do not expose smoke-only winners.
- A guarded production smoke runner exists and refuses email-based Marathon registration.
- The runner never prints JWTs, gift-code values, full IDs, or private report text.
- Gift inventory readiness remains green after smoke.
- Readiness and public journey smoke pass after deployment.

## Result

Complete. Deployed `localhost:5000/marathon:smoke-isolation-20260613-2` with shared smoke filters, public winner hiding, analytics isolation, and a guarded `smoke:production-safe` runner. Validation evidence is recorded in `docs/intent/12_validation/VAL-TASK-MAR-061.md`.
