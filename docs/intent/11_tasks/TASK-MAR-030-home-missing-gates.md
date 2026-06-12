# TASK-MAR-030: Home Missing Launch Gates

```yaml
id: TASK-MAR-030
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Make the root Marathon home page show the exact readiness classes that keep registration closed, so visitors who arrive at `/` get the same launch-status clarity as language landing, registration, and gift redemption pages.

## Scope

- Extend home readiness handling to consume safe `missing` readiness classes.
- Render missing launch gates in the closed home catalog panel.
- Add journey smoke coverage that requires the home missing-gates UI in the built bundle.
- Preserve closed registration, payment, gift, assignment, winners, and reviews behavior.

## Non-Goals

- Do not load, invent, or mutate catalog data.
- Do not open registration before readiness passes.
- Do not expose participant data, gift-code values, JWTs, payment secrets, or assignment reports.
- Do not change landing, registration, gift, payment, or assignment API behavior.

## Acceptance Criteria

- [x] Closed root home state lists missing launch gates from readiness data.
- [x] Frontend production build succeeds.
- [x] Backend build or syntax checks pass for touched verifier code.
- [x] Journey smoke reports `home-missing-gates-ui` before the expected catalog-readiness gate.
- [x] Deployment and validation evidence are recorded without sensitive data.
