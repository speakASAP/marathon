# TASK-MAR-044: Gate Closed-Catalog Landing Workflow Claims

```yaml
id: TASK-MAR-044
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
  - docs/intent/11_tasks/TASK-MAR-033-closed-catalog-landing-real-data.md
  - docs/intent/11_tasks/TASK-MAR-043-closed-catalog-pricing-gate.md
```

## Objective

Prevent closed-catalog language landing pages from presenting live daily assignment, feedback, and progress workflow cards before approved assignment/catalog data exists.

## Scope

- Keep the live "How the Marathon works" workflow only for `registrationOpen === true`.
- Render launch-readiness steps while production catalog readiness is false.
- Extend journey smoke coverage for the closed-catalog How section.
- Record production validation evidence.

## Non-Goals

- Do not invent catalog data, assignment text, participant progress, prices, or reviews.
- Do not change registration, payment, gift, or assignment APIs.
- Do not remove real launch-state workflow content.

## Acceptance Criteria

- [x] Closed-catalog language landing shows launch-readiness steps instead of live workflow cards.
- [x] Runtime DOM does not show `Daily assignment`, `Personal feedback`, or `Track progress` in the closed state.
- [x] Journey smoke includes the closed-catalog How section readiness gate.
- [x] Production Browser QA verifies `/en/#how` after deploy.
- [x] Validation is recorded in `docs/intent/12_validation/VAL-TASK-MAR-044.md`.

## Current Blocker

The full register/payment/assignment journey remains blocked by missing approved catalog rows. This task removes premature workflow promises before that data is loaded.

## Verification Summary

- Implementation commit: `521d17e Gate closed-catalog landing workflow`.
- Production image verified: `localhost:5000/marathon:521d17e`.
- `npm run check:journey` now passes `landing-how-readiness-state`; the only remaining failure is the expected `catalog-readiness` blocker.
- Browser QA route: `https://marathon.alfares.cz/en/?qa=521d17e-browser#how`.
- Browser QA evidence: `/private/tmp/marathon-how-gate-521d17e.png`.
- Runtime DOM showed `How launch opens`, `Approve catalog`, `Verify readiness`, and `Run journey smoke`.
- Runtime DOM did not show `Daily assignment`, `Personal feedback`, or `Track progress`.
- Browser console check after navigation found no warnings or errors.
