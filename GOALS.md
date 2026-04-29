# GOALS.md — marathon

> ⚠️ IMMUTABLE BY AI. This file is the human-readable goal narrative. AI agents must not modify it. The database is the system of truth for active goals.

---

## Active Goal

**Title:** VIP payment integration & gift code redemption

**Priority:** 1 (high)

**Description:**
Complete the revenue-generating features of the marathon platform:

- Wire VIP upgrade payment flow: when `MarathonParticipant.vipRequired = true` and `Marathon.vipGateDate` has passed, the participant's `needs_payment = true` — implement a checkout endpoint that calls `payments-microservice:3468` to initiate payment.
- Implement a webhook handler that receives payment confirmation from `payments-microservice` and sets `MarathonParticipant.isFree = false` and `paymentReported = true`.
- Implement gift code redemption endpoint: validate `MarathonGift.code`, mark `usedAt` and `redeemedByUserId`, and upgrade participant to VIP without payment.
- Verify end-to-end: registration → free participation → VIP gate → payment → VIP access confirmed.

**Success criteria:** At least one test participant completing the full VIP upgrade flow (payment or gift code), with `isFree = false`, `paymentReported = true`, and confirmed access to post-gate steps.

**Constraints:**

- Payment processing via `payments-microservice:3468` only — no direct provider integration.
- AI must never modify course step content or sequences.
- User progress data is private — no bulk export.
- Never cancel or refund without human approval.

**References:**

- Spec: `marathon/SPEC.md` — Module 8 (Gifts), Module 9 (VIP Payments)
- Plan: `marathon/PLAN.md` — Phase 1

---

## Backlog Goals (future phases)

### Phase 2 — Submission & Step Management API

Expose step submission creation and update via API so the frontend can record participant progress without direct DB access. Includes penalty report creation and bonus day tracking.

### Phase 3 — Winner Automation

Automate winner record creation: when a participant completes all steps, detect medal state (gold/silver/bronze) and upsert `MarathonWinner`. Currently winner records appear to be manually managed.

### Phase 4 — Analytics & Reporting

Course completion rate tracking. Payment conversion rate. Participant NPS collection (post-marathon survey via notifications-microservice).

### Phase 5 — Business Orchestrator Integration

Register `marathon` as an orchestrated project in `business-orchestrator`. Define AI task types for participant engagement (reminder emails, progress nudges via notifications-microservice).
