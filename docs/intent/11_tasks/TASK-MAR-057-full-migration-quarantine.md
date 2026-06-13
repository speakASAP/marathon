# TASK-MAR-057: Quarantine Unsafe Full Legacy Migration Path

```yaml
id: TASK-MAR-057
status: verified
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/intent/07_decisions/ADR-002-catalog-only-loader.md
  - docs/intent/11_tasks/TASK-MAR-053-legacy-catalog-audit.md
```

## Objective

Prevent a local full legacy migration experiment from being mistaken for the approved production launch path while preserving the catalog-only source-owner workflow.

## Scope

- Ignore the exact local experimental filename `scripts/migrate-legacy-marathon-full.js` so it is not accidentally staged.
- Update the catalog-only ADR to state that full migrations remain out of launch scope.
- Update the catalog import runbook to reject local full-migration experiments as launch commands.
- Do not delete or edit the local untracked file.

## Non-Goals

- Do not import participants, answers, submissions, winners, payments, gift codes, or assignment reports.
- Do not create a replacement participant/progress migration chain.
- Do not weaken catalog-only loader rules.

## Acceptance Criteria

- [x] `.gitignore` excludes `scripts/migrate-legacy-marathon-full.js`.
- [x] ADR-002 explicitly says full migration scripts are not part of the launch path.
- [x] The catalog import runbook tells operators not to use the local full-migration experiment.
- [x] The untracked local file remains untouched and unstaged.
- [x] Validation evidence is recorded in `docs/intent/12_validation/VAL-TASK-MAR-057.md`.

## Current Blocker

The production journey remains blocked by missing approved catalog JSON, not by a full participant/progress migration.
