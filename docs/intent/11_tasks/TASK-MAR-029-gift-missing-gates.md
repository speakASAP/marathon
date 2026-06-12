# TASK-MAR-029: Gift Missing Launch Gates

```yaml
id: TASK-MAR-029
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Make the gift redemption page show the exact readiness classes that keep gift redemption closed, so participants and support can see whether the blocker is catalog, assignment content, VIP product, or gift inventory without reading raw readiness JSON.

## Scope

- Extend gift readiness handling to consume safe `missing` readiness classes and full launch counts.
- Render missing launch gates in the closed gift redemption panel.
- Add journey smoke coverage that requires the gift missing-gates UI in the built bundle.
- Preserve authentication, participant-context, payment, gift, registration, and assignment gates.

## Non-Goals

- Do not load, invent, or mutate catalog data.
- Do not expose gift-code values, participant records, JWTs, payment secrets, or assignment reports.
- Do not open gift redemption before readiness passes.
- Do not change checkout, gift redemption API, or assignment submission behavior.

## Acceptance Criteria

- [x] Closed `/gift` state lists missing launch gates from readiness data.
- [x] Frontend production build succeeds.
- [x] Backend build or syntax checks pass for touched verifier code.
- [x] Journey smoke reports `gift-missing-gates-ui` before the expected catalog-readiness gate.
- [x] Deployment and validation evidence are recorded without sensitive data.
