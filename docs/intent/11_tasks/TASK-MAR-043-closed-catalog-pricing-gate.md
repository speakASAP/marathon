# TASK-MAR-043: Replace Closed-Catalog Pricing Offers With Readiness Gate

```yaml
id: TASK-MAR-043
status: in_progress
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: partial
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
  - docs/intent/11_tasks/TASK-MAR-033-closed-catalog-landing-real-data.md
```

## Objective

Prevent language landing pages from showing fallback plan names, prices, VIP plan claims, checkout affordances, or gift-code affordances while production catalog readiness is false.

## Scope

- Keep the real Starter/VIP pricing cards only for `registrationOpen === true`.
- Render a readiness-only pricing gate when the approved catalog is missing.
- Show active marathon, approved step, VIP product, and gift-code counts in the closed pricing section.
- Extend journey smoke so closed-catalog bundles fail if fallback offer markers reappear.
- Record production validation evidence.

## Non-Goals

- Do not invent catalog data or fallback prices.
- Do not change the real launch-state checkout, gift, or assignment behavior.
- Do not remove provider/legal SpeakASAP context.

## Acceptance Criteria

- [ ] Closed-catalog language landing shows a pricing readiness gate, not plan cards.
- [ ] Closed-catalog bundle does not contain fallback `EUR 0`/`€0`, `Everything in Free`, or `Most complete` offer markers.
- [ ] Journey smoke covers the readiness-only pricing state.
- [ ] Production Browser QA verifies `/en/#pricing` after deploy.
- [ ] Validation is recorded in `docs/intent/12_validation/VAL-TASK-MAR-043.md`.

## Current Blocker

The full register/payment/assignment journey remains blocked by missing approved catalog rows. This task removes misleading offer presentation before that data is loaded.
