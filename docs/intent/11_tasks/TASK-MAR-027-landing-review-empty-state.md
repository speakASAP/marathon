# TASK-MAR-027: Landing Review Empty State

```yaml
id: TASK-MAR-027
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Remove invented fallback testimonials from language landing pages and replace them with an honest empty state that only claims reviews after real Marathon participants complete approved production marathons.

## Scope

- Replace hard-coded fallback review names/copy with a single real-data empty state.
- Keep real API reviews rendering when they exist.
- Add journey smoke coverage that requires the empty state and rejects the old invented names.
- Preserve registration and catalog readiness gates.

## Non-Goals

- Do not create reviews, winners, participants, or catalog data.
- Do not change review API behavior.
- Do not change registration, payment, gift, or assignment behavior.

## Acceptance Criteria

- [x] Frontend build passes.
- [x] Backend build passes.
- [x] Language landing no longer includes invented fallback testimonial names.
- [x] Journey smoke reports `landing-review-empty-state` before the expected catalog-readiness gate.
- [x] Validation evidence is recorded without participant data.
