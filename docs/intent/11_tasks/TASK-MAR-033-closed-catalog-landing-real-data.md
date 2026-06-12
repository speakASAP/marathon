# TASK-MAR-033: Closed-Catalog Landing Real-Data Posture

```yaml
id: TASK-MAR-033
status: pending-validation
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Remove invented course, progress, and price details from language landing pages while production catalog readiness is false. The landing must stay useful and polished, but it must not imply real approved assignments, a product price, or participant progress before approved Marathon/Product/Gift/Step data exists.

## Scope

- Remove fallback VIP price rendering from the language landing.
- Replace hard-coded assignment preview and workflow sample data with readiness-only closed-catalog status.
- Keep open-registration copy focused on profile, checkout, gift, and assignment APIs without hard-coded course content.
- Add journey smoke coverage that rejects the removed fake closed-catalog markers in the built frontend bundle.

## Non-Goals

- Do not load or invent catalog data.
- Do not edit course step titles, sequences, form keys, or assignment content.
- Do not change registration, payment, gift, or assignment API behavior.
- Do not run mutating journey checks.

## Acceptance Criteria

- [ ] Closed-catalog language landing does not show default VIP price, fake day number, fake progress percent, fake assignment title, or sample workflow copy.
- [ ] Closed-catalog hero and preview show readiness counts and missing launch gates only.
- [ ] VIP price/checkout copy does not display a numeric fallback price without an approved product value from the API.
- [ ] Frontend production build succeeds.
- [ ] Backend build or verifier syntax checks pass for touched verifier code.
- [ ] Journey smoke reports `landing-closed-catalog-real-data-ui` before the expected catalog-readiness gate.
- [ ] Browser validation confirms deployed `/en/` renders readiness-only landing content without the removed fake markers.
- [ ] Deployment and validation evidence are recorded without sensitive data.
