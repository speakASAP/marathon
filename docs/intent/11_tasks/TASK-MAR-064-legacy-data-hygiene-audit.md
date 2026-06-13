# TASK-MAR-064: Legacy Data Hygiene Audit

```yaml
id: TASK-MAR-064
status: implemented
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: partial
upstream:
  - docs/intent/04_systems/SYS-001-marathon-platform.md
goal_impact:
  - docs/intent/22_goal_impact/GOAL-IMPACT-TASK-MAR-064.md
execution_plan:
  - docs/intent/21_execution_plans/EP-TASK-MAR-064.md
```

## Objective

Add a read-only operational audit for known non-blocking legacy import hygiene findings after launch data became sufficient.

## Scope

- Report duplicate participant/step submission groups.
- Report active participants that have completed every catalog step.
- Report negative legacy submission ratings.
- Mask participant, step, submission, and marathon identifiers in output.
- Provide JSON and text output without mutating production records.

## Non-Goals

- Do not delete or merge duplicate submissions.
- Do not mark participants inactive.
- Do not rewrite historical ratings.
- Do not print participant emails, phone numbers, names, reports, JWTs, gift codes, payment identifiers, or survey comments.

## Acceptance Criteria

- [x] `npm run audit:data-hygiene` exists.
- [x] The script is read-only and uses aggregate counts plus masked samples only.
- [x] The script can emit JSON for operator capture.
- [x] Findings are non-blocking by default and only fail the process with `--fail-on-findings`.
- [ ] In-pod production execution is captured after deploy or approved pod-level validation.
- [x] Documentation and validation evidence are updated without overclaiming runtime DB proof.

## Current Status

Implemented in the remote repository. SSH-host validation confirms script syntax; direct SSH execution cannot reach `db-server-postgres:5432`, so runtime output remains pending until the script runs inside the deployed Marathon pod or an approved equivalent pod-level validation path.
