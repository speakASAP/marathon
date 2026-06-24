---
id: ADR-007
task: TASK-MAR-069
status: accepted
date: 2026-06-24
---

# ADR-007: Support-Chat Knowledge Guardrails

## Decision

The support-chat bot receives a cached aggregate/catalog knowledge snapshot rather than direct unrestricted database access or raw participant records.

## Rationale

The bot needs broad Marathon awareness, but the prompt context must stay safe for model processing. Catalog and aggregate data are enough for general support, while participant reports, payment internals, gift codes, and identities are not required and raise privacy risk.

## Consequences

- Answers can reference current Marathon languages, active catalog, step sequence, assignment availability, readiness, and aggregate progress.
- The model cannot inspect private participant report bodies or payment objects.
- User-specific support can be added later through an authenticated, explicitly scoped context path.
