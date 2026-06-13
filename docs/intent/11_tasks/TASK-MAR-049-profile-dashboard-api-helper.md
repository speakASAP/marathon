# TASK-MAR-049: Centralize Profile Dashboard API Access

```yaml
id: TASK-MAR-049
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
  - docs/intent/11_tasks/TASK-MAR-038-profile-empty-readiness.md
  - docs/intent/11_tasks/TASK-MAR-048-profile-api-helper.md
```

## Objective

Reduce profile-dashboard complexity by moving the authenticated `/api/v1/me/marathons` list request into the typed profile Marathon API helper while preserving the current login, load-error, and empty-readiness states.

## Scope

- Extend `frontend/src/api/profileMarathon.ts` with a typed dashboard marathon summary and `fetchMyMarathons()`.
- Refactor `frontend/src/pages/Profile.tsx` to consume the helper instead of owning raw `authFetch` response parsing.
- Keep the dashboard UI behavior unchanged for unauthenticated users, failed profile loads, empty marathon lists, and populated marathon cards.
- Rebuild static frontend assets and run read-only journey smoke.

## Non-Goals

- Do not change `/api/v1/me/marathons` response semantics.
- Do not change registration, checkout, payment callback, gift, assignment, or catalog-loader behavior.
- Do not run mutating journey checks without approved catalog rows and authenticated smoke inputs.
- Do not expose participant, token, gift, payment, or private report data in validation artifacts.

## Acceptance Criteria

- [x] `Profile.tsx` no longer owns raw authenticated marathon-list endpoint parsing.
- [x] Auth-required state still shows the profile login handoff.
- [x] Profile load failures still render the support/refresh error state.
- [x] Empty dashboard still uses catalog readiness before showing registration actions.
- [x] `npm run build:frontend` passes.
- [x] `npm run check:journey` passes catalog-independent profile dashboard assertions before the known `catalog-readiness` blocker.
- [x] Validation evidence is recorded in `docs/intent/12_validation/VAL-TASK-MAR-049.md`.

## Current Blocker

Live populated dashboard proof still requires approved catalog rows and authenticated participant inputs.
