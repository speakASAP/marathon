# TASK-MAR-021: Publish Catalog Source-Owner Approval Checklist

```yaml
id: TASK-MAR-021
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
  - docs/intent/11_tasks/TASK-MAR-020-pod-catalog-load-runbook.md
```

## Objective

Give source owners and operators one public approval checklist for launch catalog JSON so production data can be approved, dry-run, applied, and verified without guessing fields or recording sensitive data.

## Scope

- Add a source-owner catalog approval checklist.
- Serve the checklist from `/catalog/` beside the schema and example.
- Link the checklist from the support launch gate.
- Add read-only journey smoke coverage for the checklist URL and support-link copy.
- Record validation without catalog gift-code inventories, participant exports, JWTs, payment secrets, or assignment reports.

## Non-Goals

- Do not load or invent catalog data.
- Do not relax catalog loader validation.
- Do not publish real gift-code values or source-owner private documents.
- Do not open registration before readiness is true.

## Acceptance Criteria

- [x] `docs/marathon-catalog-approval-checklist.md` documents source-owner approval, dry-run, apply, and verification gates.
- [x] `/catalog/marathon-catalog.approval-checklist.md` is served publicly.
- [x] `/support` links the approval checklist in the launch gate.
- [x] `npm run check:journey` verifies the public checklist and support bundle copy before the catalog readiness gate.
- [x] Build, deploy, smoke, and validation evidence are recorded.
