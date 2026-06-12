# TASK-MAR-041: Make Public Shell Marathon-First

```yaml
id: TASK-MAR-041
status: in_progress
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: partial
upstream:
  - docs/intent/01_vision/VISION.md
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Make the public first viewport and registration entry point present Marathon as the primary product brand while retaining SpeakASAP as provider/legal context.

## Scope

- Change the global header brand from SpeakASAP-first to Marathon-first.
- Change the root home title and hero headline to lead with Marathon.
- Change registration form heading and note to use Marathon-first wording.
- Add journey-smoke coverage so the public bundle keeps Marathon-first brand markers.
- Record validation evidence after build, deploy, smoke, and browser QA.

## Non-Goals

- Do not remove SpeakASAP legal/company references.
- Do not invent catalog data, pricing, assignment text, or gift codes.
- Do not change payment provider behavior or auth portal integration.

## Acceptance Criteria

- [ ] Production root first viewport shows Marathon as the primary product brand.
- [ ] Registration form copy says Marathon first.
- [ ] SpeakASAP remains only as provider/legal context on changed surfaces.
- [ ] Read-only journey smoke includes a public Marathon branding check.
- [ ] Production validation is recorded in `docs/intent/12_validation/VAL-TASK-MAR-041.md`.

## Current Blocker

Approved catalog rows are still absent, so this task can improve public brand readiness but cannot complete the full register/payment/assignment journey.
