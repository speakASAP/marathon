# TASK-MAR-025: Registration Missing Launch Gates

```yaml
id: TASK-MAR-025
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Make the standalone registration page show the exact readiness classes that keep registration closed, so visitors and operators can see why the launch gate is still active without opening developer tools or raw JSON.

## Scope

- Render `/api/v1/marathons/readiness.missing` inside the closed registration panel.
- Keep registration language links hidden while `registrationOpen` is false.
- Add bundled smoke coverage for the missing-launch-gates UI.
- Preserve the current catalog, payment, gift, and assignment gates.

## Non-Goals

- Do not load or invent catalog data.
- Do not open registration before readiness passes.
- Do not change payment, gift redemption, or assignment submission behavior.

## Acceptance Criteria

- [x] `/register` closed-catalog state lists missing launch gates from readiness data.
- [x] Frontend production build succeeds.
- [x] Journey smoke reports `register-missing-gates-ui` before the expected catalog-readiness gate.
- [x] Deployment and validation evidence are recorded without sensitive data.
