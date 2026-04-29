> AI agents may update task status in §Phase 1 only. Do not modify Phase headings or add new phases.

## Phase 1 — VIP Payment & Gift Code (Active)

**Goal:** Make VIP upgrade and gift code redemption functional end-to-end.

| ID | Task | Status |
|----|------|--------|
| T1 | Implement VIP checkout endpoint calling payments-microservice:3468 | pending |
| T2 | Implement payment webhook handler — set `isFree=false`, `paymentReported=true` on confirmation | pending |
| T3 | Implement gift code redemption endpoint — validate code, mark used, upgrade participant to VIP | pending |
| T4 | Verify end-to-end VIP flow: registration → gate → payment/gift → VIP access | pending |

**Completion criterion:** At least one participant completes VIP upgrade (payment or gift code) with `isFree = false` and confirmed post-gate step access.

---

## Phase 2 — Submission API (Backlog)

Expose step submission CRUD via REST API. Includes penalty report creation and bonus day management.

---

## Phase 3 — Winner Automation (Backlog)

Auto-detect and upsert `MarathonWinner` records when participants complete all steps.

---

## Phase 4 — Analytics (Backlog)

Completion rate and payment conversion dashboards. NPS survey flow.

---

## Phase 5 — Business Orchestrator Integration (Backlog)

Register marathon in business-orchestrator. Define AI task types for participant engagement.
