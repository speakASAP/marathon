# TASK-MAR-022: Add Redacted Catalog Approval Packet

```yaml
id: TASK-MAR-022
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
  - docs/intent/11_tasks/TASK-MAR-021-catalog-source-owner-approval.md
```

## Objective

Make source-owner catalog approval easier to verify by generating a redacted Markdown packet from the candidate catalog JSON before any production write.

## Scope

- Add a read-only `--approval-packet` mode to the catalog loader.
- Allow the pod-safe helper to pass `--approval-packet`.
- Show the approval-packet command in the support launch runbook.
- Update catalog handoff docs and public checklist copy.
- Add journey smoke coverage for the support runbook command.

## Non-Goals

- Do not load catalog data.
- Do not print gift-code values, participant records, JWTs, payment keys, assignment reports, or assignment text.
- Do not bypass source-owner approval or the existing launch-ready validation.
- Do not open registration before production readiness is true.

## Acceptance Criteria

- [x] `node scripts/load-marathon-catalog.js <catalog.json> --approval-packet` prints a redacted Markdown approval packet.
- [x] `--approval-packet` cannot be combined with `--apply`.
- [x] `npm run load:catalog:pod -- <catalog.json> --approval-packet` is accepted by the pod helper.
- [x] `/support` shows the approval-packet command.
- [x] Documentation and validation evidence are recorded.
