# TASK-MAR-007: Add Catalog Handoff Contract

```yaml
id: TASK-MAR-007
status: active
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
related_adrs:
  - docs/intent/07_decisions/ADR-002-catalog-only-loader.md
```

## Objective

Make the approved catalog-data handoff explicit and machine-readable so Marathon can move from closed catalog state to launch verification without importing unsafe progress data or guessing loader fields.

## Scope

- Add a JSON Schema for catalog-only launch data.
- Update the catalog import runbook with approval checklist requirements.
- Make catalog loader dry runs emit a redacted per-marathon launch checklist.
- Verify the existing shape-only example still dry-runs successfully.

## Non-Goals

- Do not create or infer real course content.
- Do not load production catalog data.
- Do not expose gift-code inventories, participant data, JWTs, payment secrets, or progress data.

## Acceptance Criteria

- [ ] `docs/schemas/marathon-catalog.schema.json` documents allowed catalog-only fields and rejects extra top-level data.
- [ ] `docs/marathon-catalog-import.md` tells source owners how to prepare, approve, dry-run, apply, and verify catalog data.
- [ ] `scripts/load-marathon-catalog.js` dry-run output includes per-marathon readiness counts and missing classes without printing gift code values.
- [ ] `node scripts/load-marathon-catalog.js docs/examples/marathon-catalog.example.json` passes.
- [ ] Build and deployed runtime verification are recorded.

