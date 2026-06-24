---
id: CP-TASK-MAR-069
task: TASK-MAR-069
feature: FEAT-004
status: implemented
---

# Context Package: TASK-MAR-069

## Source Files

- `src/support-chat/support-chat.service.ts`
- `src/support-chat/support-chat.module.ts`
- `src/support-chat/marathon-knowledge.service.ts`
- `src/marathons/marathons.service.ts`
- `src/steps/steps.service.ts`
- `scripts/check-marathon-journey.js`

## Data Sources

- `MarathonsService.catalogReadiness()`
- `MarathonsService.analytics()`
- `MarathonsService.list(undefined, true)`
- `MarathonsService.listLanguages()`
- `StepsService.listByMarathonId(marathonId)`

## Privacy Boundaries

Allowed:

- Canonical Marathon facts.
- Active marathon language/catalog summaries.
- Step title, sequence, approved-assignment presence, and short sanitized assignment summaries.
- Aggregate readiness and analytics.

Forbidden:

- Participant email, phone, raw name, user ID, full participant ID.
- JWTs, callback keys, payment secrets, checkout URLs, order IDs.
- Gift codes or full gift-code inventories.
- Raw participant answers, report text, peer report bodies, and NPS comments.

## Operational Assumptions

- Kubernetes/shared PostgreSQL `marathon` remains the production source of truth.
- The support-chat model may be unavailable, so safe deterministic fallback must remain.
