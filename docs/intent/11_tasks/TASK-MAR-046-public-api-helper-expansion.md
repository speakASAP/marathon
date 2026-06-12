# TASK-MAR-046: Centralize Public Frontend API Access

```yaml
id: TASK-MAR-046
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
  - docs/intent/11_tasks/TASK-MAR-045-public-api-helper.md
```

## Objective

Move remaining public read-only Marathon frontend data access onto the shared typed helper so registration, gift, profile, support, reviews, home, and navigation surfaces use one readiness/language/review/winner contract before catalog load.

## Scope

- Extend `frontend/src/api/publicMarathon.ts` with readiness flags and public winner teaser types.
- Refactor direct public readiness calls out of `Layout`, `Gift`, `Profile`, `Register`, and `Support`.
- Refactor public language/review/winner teaser calls out of `Home`, `Register`, and `Reviews`.
- Preserve all closed-catalog, login, gift, payment, and assignment guard behavior.
- Rebuild static frontend assets and run read-only journey smoke.

## Non-Goals

- Do not change mutating registration, gift redemption, checkout, profile, or assignment APIs.
- Do not open registration without approved catalog data.
- Do not alter payment provider, auth portal, or catalog loader behavior.
- Do not create or infer course, gift, participant, payment, or assignment data.

## Acceptance Criteria

- [x] Public readiness/language/review/winner endpoint strings are centralized in `frontend/src/api/publicMarathon.ts`.
- [x] Public pages use the shared typed helper instead of duplicate fetch parsing for those endpoints.
- [x] `npm run build:frontend` passes.
- [x] `npm run check:journey` passes catalog-independent frontend checks before the known `catalog-readiness` blocker.
- [x] Validation evidence is recorded in `docs/intent/12_validation/VAL-TASK-MAR-046.md`.

## Current Blocker

The final registration, payment, gift, and assignment journey remains blocked by missing source-owner approved catalog rows and explicit mutating test inputs.
