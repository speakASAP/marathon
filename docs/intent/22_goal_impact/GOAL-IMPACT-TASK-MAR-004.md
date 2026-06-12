# GOAL-IMPACT-TASK-MAR-004: Verify End-to-End VIP and Assignment Flow

```yaml
id: GOAL-IMPACT-TASK-MAR-004
artifact_type: task
artifact_id: TASK-MAR-004
artifact_path: docs/intent/11_tasks/TASK-MAR-004-verify-end-to-end-vip-flow.md
primary_goal: VG-002
secondary_goals:
  - VG-001
  - VG-003
  - VG-004
  - VG-005
impact_level: critical
impact_description: Proves that registration, VIP unlock, gift redemption, assignment submission, saved report readback, and readiness UX work against approved catalog data.
success_metric: At least one approved production verification path completes with masked evidence recorded in VAL-TASK-MAR-004.
upstream_links:
  - docs/intent/01_vision/VISION.md
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
downstream_links:
  - docs/intent/21_execution_plans/EP-TASK-MAR-004.md
  - docs/intent/12_validation/VAL-TASK-MAR-004.md
validation_method: Readiness preflight, journey smoke, and validation report.
status: reviewed
```

## Explanation

This task connects the current implementation-complete state to the original launch intent. Without verification on approved catalog data, the product cannot prove that registration, payments/gifts, and assignment progress are ready for real users.

## Evidence

- `SYSTEM.md` Current State documents implementation status and blockers.
- `TASKS.md` T4 remains blocked by missing approved catalog data.
- `docs/marathon-catalog-import.md` documents safe catalog loading.

## Validation

Validation is complete only when `VAL-TASK-MAR-004` records passing readiness and journey evidence or a human-approved decision to accept a documented residual blocker.
