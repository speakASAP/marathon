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
- [x] 2026-06-12 payments-microservice registered Marathon integration: Kubernetes override secret supplies `marathon` callback API key mapping without exposing secret values
- [x] 2026-06-12 Production data source checked: no `marathon_export.json` or non-empty seed found under `/home/ssf/Documents`; active Marathon/Product/Gift/Step data still requires approved export or human-provided course data
- [x] 2026-06-12 Legacy portal exporter audited: current `speakasap-portal` exporter is a stub because the legacy DB was archived; historical exporter included participants/answers/winners and is not safe to run as-is under no-bulk-progress-export rules
