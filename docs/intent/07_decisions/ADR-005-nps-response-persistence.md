# ADR-005: Store Post-Marathon NPS Responses

```yaml
id: ADR-005
status: reviewed
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/01_vision/VISION.md
  - docs/intent/02_business_case/BUSINESS_CASE.md
```

## Context

Phase 4 requires participant NPS tracking. Static review text is not enough because it cannot measure post-marathon satisfaction or conversion health.

## Decision

Store one authenticated NPS response per `MarathonParticipant` after completion. The participant may update their own response, but public and support surfaces expose aggregate counts and scores only.

## Consequences

- The profile can ask finished participants for feedback without exposing private responses publicly.
- Support analytics can show response count, average score, and NPS score.
- Comments remain participant-owned private data and are not included in aggregate analytics.
