> AI agents may update task status in §Phase 1 only. Do not modify Phase headings or add new phases.

## Phase 1 — VIP Payment & Gift Code (Active)

**Goal:** Make VIP upgrade and gift code redemption functional end-to-end.

| ID | Task | Status |
|----|------|--------|
| T1 | Implement VIP checkout endpoint calling payments-microservice:3468 | verified complete in production-safe smoke |
| T2 | Implement payment webhook handler — set `isFree=false`, `paymentReported=true` on confirmation | verified complete in production-safe smoke |
| T3 | Implement gift code redemption endpoint — validate code, mark used, upgrade participant to VIP | verified complete in production-safe smoke |
| T4 | Verify end-to-end VIP flow: registration → gate → payment/gift → VIP access | verified complete against Kubernetes/shared PostgreSQL production data |

**Completion criterion:** Complete. Guarded production-safe smoke verified registration, checkout creation, Marathon webhook settlement, VIP profile state, confirmed payment ledger, gift redemption, full assignment completion, winner reconciliation, and NPS create/update without exposing secrets or participant private content.

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

## Phase 5 — RunLayer Integration (Backlog)

Register marathon in runlayer. Define AI task types for participant engagement.
