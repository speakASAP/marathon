# CP-TASK-MAR-007: Catalog Handoff Contract Context

```yaml
id: CP-TASK-MAR-007
task: docs/intent/11_tasks/TASK-MAR-007-catalog-handoff-contract.md
created: 2026-06-12
last_updated: 2026-06-12
```

## Current State

Production is healthy but closed for registration because readiness reports zero active marathons, products, gifts, steps, and step assignment content. The existing loader is safe and create-only, but its dry-run output previously showed only aggregate counts.

## Required Context

- `docs/marathon-catalog-import.md`
- `docs/examples/marathon-catalog.example.json`
- `scripts/load-marathon-catalog.js`
- `scripts/check-marathon-readiness.js`
- `docs/intent/07_decisions/ADR-002-catalog-only-loader.md`
- `docs/intent/12_validation/VAL-TASK-MAR-004.md`

## Key Constraints

- Approved source-of-truth catalog content must come from a human or trusted source system.
- The loader must reject progress/user data.
- Validation artifacts must not include full gift-code inventories or secrets.
- Final registration/payment/assignment verification remains blocked until real approved catalog data exists.

