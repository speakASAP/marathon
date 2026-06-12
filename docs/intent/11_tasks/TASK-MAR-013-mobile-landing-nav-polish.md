# TASK-MAR-013: Polish Mobile Landing Navigation

```yaml
id: TASK-MAR-013
status: active
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Make the public language landing navigation readable and non-clipped on narrow mobile viewports while registration is closed for missing catalog data.

## Scope

- Fix the mobile landing navigation links so labels fit inside their controls.
- Preserve the existing registration readiness gates and closed-catalog messaging.
- Keep the change limited to frontend presentation and built static assets.

## Non-Goals

- Do not load catalog data.
- Do not open registration.
- Do not change payment, gift, assignment, or readiness semantics.

## Acceptance Criteria

- [ ] Mobile `/en/` landing nav renders all section links without clipped labels.
- [ ] Hero registration-status action still scrolls to the closed-registration panel.
- [ ] Backend and frontend builds pass.
- [ ] Deployment and Browser QA evidence are recorded.
