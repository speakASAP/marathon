---
id: FEAT-004
title: Support Chat Knowledge Base
status: active
subsystem: SUB-004
task: TASK-MAR-069
---

# Support Chat Knowledge Base

## Feature

The public support chat answers Marathon questions using a complete participant-safe overview of the current product: canonical rules, active languages, registration status, VIP/gift behavior, report scheduling, participant journey, aggregate analytics, and sanitized step catalog summaries.

## Acceptance

- Chat answers in-scope Marathon questions with live, safe context.
- Chat refuses prompt-injection and out-of-scope requests.
- Duration questions always preserve the canonical 30-day route.
- Knowledge context is cacheable, versioned, and aggregate-only.
- AI fallback never exposes secrets, participant-private fields, raw reports, payment internals, or gift codes.

## Non-Goals

- Personalized account support without authenticated ownership.
- Validating gift codes, payments, or participant identity in public chat.
- Replacing human support for billing/account-specific cases.
