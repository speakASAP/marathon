# Tasks: marathon

## Backlog

- [x] T1: Implement VIP checkout endpoint calling payments-microservice:3468 (goal_id: vip-payment, priority: 1)
- [x] T2: Implement payment webhook handler — set isFree=false, paymentReported=true on confirmation (goal_id: vip-payment, priority: 1)
- [x] T3: Implement gift code redemption endpoint (goal_id: vip-payment, priority: 2)
- [ ] T4: Verify end-to-end VIP upgrade flow (goal_id: vip-payment, priority: 2)
- [ ] Review course step content for upcoming marathon (priority: 3)
- [ ] Generate participant progress report (priority: 3)

## Completed
<!-- AI appends here. Never modifies previous entries. -->
- [x] 2026-04-05 Documentation standard applied
- [x] 2026-04-29 Full documentation suite created: SPEC.md, PLAN.md, GOALS.md; SYSTEM.md and AGENTS.md enriched
- [x] 2026-06-12 Frontend rebuild deployed: modern landing, registration redirect normalization, profile VIP gate panel, gift-code surface, SPA route fallback, and deploy script exact-tag rollout fix
- [x] 2026-06-12 VIP backend implemented: authenticated checkout endpoint, payments callback handler, gift-code redemption, participant claim on profile return, and frontend checkout/gift actions
- [x] 2026-06-12 Assignment submission implemented: authenticated StepSubmission create/update endpoint, late penalty report/bonus-day tracking, profile next-step activation, and Step page report form
