# TASK-MAR-009: Add Support Launch Runbook Panel

```yaml
id: TASK-MAR-009
status: active
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Turn the support dashboard's closed-catalog warning into an operator-facing launch unblocker that shows missing catalog classes and the safe catalog-loader sequence.

## Scope

- Render missing readiness classes as readable chips.
- Show the approved catalog JSON, dry-run, apply, and readiness commands.
- Keep sensitive-data warnings visible.
- Preserve aggregate-only analytics and current registration gates.

## Non-Goals

- Do not load catalog data.
- Do not expose gift-code inventories, participant data, payment secrets, JWTs, or assignment reports.
- Do not change analytics/readiness API semantics.

## Acceptance Criteria

- [ ] `/support` shows a launch gate panel when catalog readiness is false.
- [ ] The panel lists the missing catalog classes from analytics.
- [ ] The panel displays the safe loader command sequence.
- [ ] Browser QA verifies the rendered panel and console health.

