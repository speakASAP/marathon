# TASK-MAR-024: Landing Asset Serving Smoke Coverage

```yaml
id: TASK-MAR-024
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/11_tasks/TASK-MAR-023-resolve-legacy-landing-assets.md
```

## Objective

Harden the Marathon journey smoke so the rebuilt landing page verifies that every resolved legacy landing image path is actually served by production as an image, not only referenced by built CSS.

## Scope

- Reuse a single landing asset list for built CSS reference checks.
- Add HTTP checks for each resolved `/img/landing/*.png` asset.
- Fail the smoke if any landing image URL is missing, empty, or served as non-image content.
- Preserve the existing read-only smoke behavior and the catalog-readiness gate.

## Non-Goals

- Do not add, replace, or redesign landing imagery.
- Do not load catalog data or bypass launch readiness.
- Do not run mutating registration, payment, gift, or assignment checks.

## Acceptance Criteria

- [x] `node --check scripts/check-marathon-journey.js` passes.
- [x] Read-only journey smoke reports `landing-assets-served` before the catalog-readiness gate.
- [x] Smoke still fails closed at `catalog-readiness` while approved Marathon/Product/Gift/Step rows are absent.
- [x] Validation evidence is recorded without sensitive runtime data.
