# TASK-MAR-053: Audit Legacy Marathon Catalog Sources

```yaml
id: TASK-MAR-053
status: verified
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/intent/21_execution_plans/EP-TASK-MAR-004.md
  - docs/intent/07_decisions/ADR-002-catalog-only-loader.md
```

## Objective

Turn the separate Alphares data-source audit into a repeatable, read-only production step by adding a redacted legacy catalog audit tool for the found SpeakASAP Marathon fixture and SQL candidates.

## Scope

- Add a Node script that reads legacy Django fixture metadata without printing participant data, assignment text, gift codes, secrets, or raw record payloads.
- Report counts, field names, paths, redacted marathon identifiers, step counts, and launch blockers against the approved Marathon catalog-only loader contract.
- Keep the tool read-only: no catalog JSON generation, no database connection, no `--apply`, no migrations, and no loader invocation.
- Update intent-preservation validation after running the script against the found legacy candidates.

## Non-Goals

- Do not import legacy data.
- Do not treat the legacy fixture as approved production catalog data.
- Do not create products, gifts, assignment content, participants, submissions, payments, winners, or reviews.
- Do not weaken catalog readiness gates or journey smoke checks.

## Acceptance Criteria

- [x] `npm run audit:legacy-catalog -- --fixture <path> [--sql <path>]` prints a redacted Markdown audit.
- [x] The audit reports that the legacy fixture is not launch-ready because assignment content, VIP products, gift codes, and source-owner approval are missing.
- [x] `node --check scripts/audit-legacy-marathon-catalog.js` passes.
- [x] Validation evidence is recorded in `docs/intent/12_validation/VAL-TASK-MAR-053.md`.

## Current Blocker

The found legacy fixture can identify Marathon/Step catalog candidates, but it is not an approved launch catalog and does not include all data required to open registration, payment, gift redemption, and assignments.
