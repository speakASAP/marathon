---
id: GOAL-IMPACT-TASK-MAR-069
task: TASK-MAR-069
feature: FEAT-004
system: marathon
status: implemented
---

# Goal Impact: Full Support-Chat Marathon Knowledge Context

## User Goal

Participants and operators need the support chatbot to understand the whole Marathon product, not only a small static FAQ. It must answer questions about duration, report cadence, steps, assignments, languages, VIP unlock, gifts, registration, profile continuation, and operational status from the current Marathon catalog.

## Product Impact

- Reduces support dead ends by giving the bot a safe, current overview of Marathon structure.
- Keeps answers aligned with the live catalog, active languages, assignment readiness, and aggregate status.
- Preserves privacy by keeping participant reports, payment secrets, gift codes, raw NPS comments, and private identifiers outside the prompt context.

## Success Criteria

- The support-chat response includes a stable `knowledge_version`.
- The bot can answer the canonical 30-day duration question.
- The bot can ground answers in active language and step catalog data.
- If knowledge loading fails, the endpoint still returns a safe fallback rather than exposing internals.
