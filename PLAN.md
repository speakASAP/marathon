> AI agents may update task status in §Phase 1 only. Do not modify Phase headings or add new phases.

## Phase 1 — VIP Payment & Gift Code (Active)

**Goal:** Make VIP upgrade and gift code redemption functional end-to-end.

| ID | Task | Status |
|----|------|--------|
| T1 | Implement VIP checkout endpoint calling payments-microservice:3468 | implemented; pending live payment verification |
| T2 | Implement payment webhook handler — set `isFree=false`, `paymentReported=true` on confirmation | implemented; pending live payment verification |
| T3 | Implement gift code redemption endpoint — validate code, mark used, upgrade participant to VIP | implemented; pending gift-code data verification |
| T4 | Verify end-to-end VIP flow: registration → gate → payment/gift → VIP access | blocked by missing approved active Marathon/Product/Gift/Step catalog data; legacy exporter was removed and historical full export includes user progress |

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

## Phase 5 — RunLayer Integration (Backlog)

Register marathon in runlayer. Define AI task types for participant engagement.
