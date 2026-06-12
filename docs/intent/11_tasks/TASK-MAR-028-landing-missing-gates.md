# TASK-MAR-028: Landing Missing Launch Gates

```yaml
id: TASK-MAR-028
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Make the language landing registration-status panel show the exact readiness classes that keep registration closed, so visitors arriving from campaign or language URLs can understand launch blockers without navigating to the standalone registration page.

## Scope

- Extend language landing readiness handling to consume safe `missing` readiness classes.
- Render the missing launch gates in the closed registration panel.
- Add journey smoke coverage that requires the landing missing-gates UI in the built bundle.
- Preserve the existing registration, payment, gift, and assignment gates.

## Non-Goals

- Do not load, invent, or mutate catalog data.
- Do not open registration before readiness passes.
- Do not expose participant data, gift codes, payment secrets, or assignment reports.
- Do not change review, payment, gift, or assignment behavior.

## Acceptance Criteria

- [x] Closed language landing registration panel lists missing launch gates from readiness data.
- [x] Frontend production build succeeds.
- [x] Backend build or syntax checks pass for touched verifier code.
- [x] Journey smoke reports `landing-missing-gates-ui` before the expected catalog-readiness gate.
- [x] Deployment and validation evidence are recorded without sensitive data.
