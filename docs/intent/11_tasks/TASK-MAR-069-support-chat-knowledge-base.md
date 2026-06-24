---
id: TASK-MAR-069
title: Build full support-chat Marathon knowledge context
status: complete
feature: FEAT-004
subsystem: SUB-004
priority: 1
---

# TASK-MAR-069: Build Full Support-Chat Marathon Knowledge Context

## Objective

Move the support chat from a short hard-coded context to a versioned, live Marathon knowledge context that gives the bot a broad safe overview of the product and current catalog.

## Scope

- Add `MarathonKnowledgeService`.
- Include active marathons, languages, readiness, aggregate analytics, step catalog digest, relevant assignment summaries, report scheduling, VIP/gift guidance, and safe escalation actions.
- Keep guardrails in `SupportChatService`.
- Extend journey smoke for support-chat knowledge version and canonical 30-day duration.
- Preserve privacy boundaries.

## Non-Goals

- No user-specific account diagnosis in public chat.
- No raw reports, gift codes, payment/order payloads, participant identifiers, or secrets in context.
- No new external storage or vector database.

## Acceptance Criteria

- `POST /api/v1/support/chat` returns `knowledge_version=support-chat-knowledge-v1` for in-scope questions.
- Duration question returns the 30-day canonical fact.
- Prompt injection is refused.
- Read-only journey smoke passes.
- Production smoke remains green after deploy.

## Validation

See `docs/intent/12_validation/VAL-TASK-MAR-069.md`.
