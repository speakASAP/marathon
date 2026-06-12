# TASK-MAR-023: Resolve Legacy Landing Asset References

```yaml
id: TASK-MAR-023
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Remove broken legacy landing image references from the production frontend so the rebuilt Marathon landing surfaces do not ship missing `/img/landing/adv_*` or `/img/landing/support.png` assets.

## Scope

- Replace missing legacy advantage icons with existing public landing assets.
- Replace the missing contact support background with an existing public landing asset.
- Add journey smoke coverage against the built CSS asset.
- Preserve the current registration/catalog readiness gates.

## Non-Goals

- Do not introduce new generated or third-party image assets.
- Do not change catalog data, registration behavior, payment behavior, or assignment behavior.
- Do not bypass the closed-catalog launch state.

## Acceptance Criteria

- [x] Frontend build no longer warns about `/img/landing/adv_1.png` through `/img/landing/adv_6.png`.
- [x] Frontend build no longer warns about `/img/landing/support.png`.
- [x] Built CSS references existing public landing assets.
- [x] Journey smoke reports `landing-assets-resolved` before the expected catalog-readiness gate.
- [x] Deployment and validation evidence are recorded.
