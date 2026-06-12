# TASK-MAR-011: Add Catalog Contract Smoke Coverage

```yaml
id: TASK-MAR-011
status: active
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Make the read-only journey smoke verifier protect the public catalog schema/example URLs that source owners use for launch handoff.

## Scope

- Verify the public catalog schema URL returns JSON, not the SPA shell.
- Verify the public catalog example URL returns placeholder-only JSON.
- Reject participant/progress markers in the public example.
- Keep checks read-only and runnable before catalog data exists.

## Non-Goals

- Do not load catalog data.
- Do not publish real catalog content.
- Do not add mutating import/upload behavior.

## Acceptance Criteria

- [ ] `npm run check:journey` reports `catalog-contract-schema`.
- [ ] `npm run check:journey` reports `catalog-contract-example`.
- [ ] The smoke still stops at the expected `catalog-readiness` gate while production catalog data is absent.
- [ ] Build, deploy, and validation evidence are recorded.

