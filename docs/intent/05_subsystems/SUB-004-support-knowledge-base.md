---
id: SUB-004
title: Support Chat Knowledge Base
status: active
owner: Product Owner
task: TASK-MAR-069
---

# Support Chat Knowledge Base

## Purpose

Provide participant-safe Marathon support answers from live catalog, readiness, analytics, language, and assignment metadata without exposing private participant data, reports, payment internals, gift codes, tokens, or secrets.

## Boundaries

In scope:
- Public support chat at `/api/v1/support/chat`.
- Aggregate readiness and analytics.
- Active marathon language/catalog metadata.
- Sanitized step titles and assignment summaries.
- Static participant journey, VIP/gift/report-time guidance, and support escalation actions.

Out of scope:
- Account-specific diagnosis without authenticated owner context.
- Gift-code validation or payment/order lookup.
- Private submissions, reports, NPS comments, participant email/phone/name, tokens, and secret values.

## Dependencies

- `MarathonsService` for active marathons, languages, readiness, and aggregate analytics.
- `StepsService` for sanitized active step metadata.
- `ai-microservice` for completion when available.
- Deterministic fallback responses when AI is unavailable or rejected by guardrails.

## Privacy Contract

The subsystem may provide aggregate counts and public catalog data only. It must not include raw `StepSubmission.payloadJson`, participant identifiers, email, phone, gift codes, order IDs, payment payloads, NPS comments, JWTs, API keys, or internal secrets in chat context or answers.
