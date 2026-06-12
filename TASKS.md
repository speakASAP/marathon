# Tasks: marathon

## Backlog

- [x] T1: Implement VIP checkout endpoint calling payments-microservice:3468 (goal_id: vip-payment, priority: 1)
- [x] T2: Implement payment webhook handler — set isFree=false, paymentReported=true on confirmation (goal_id: vip-payment, priority: 1)
- [x] T3: Implement gift code redemption endpoint (goal_id: vip-payment, priority: 2)
- [ ] T4: Verify end-to-end VIP upgrade flow (goal_id: vip-payment, priority: 2)
- [ ] Review course step content for upcoming marathon (priority: 3)
- [x] Generate participant progress report (priority: 3)

## Completed
<!-- AI appends here. Never modifies previous entries. -->
- [x] 2026-06-12 Intent Preservation System documentation added: local constitution, vision, business case, domain glossary, system/subsystem docs, ADRs, feature/task chain, goal impact, execution plan, context package, coding prompt, validation report, invariants, audit checklist, and pre-coding/deployment gates
- [x] 2026-04-05 Documentation standard applied
- [x] 2026-04-29 Full documentation suite created: SPEC.md, PLAN.md, GOALS.md; SYSTEM.md and AGENTS.md enriched
- [x] 2026-06-12 Frontend rebuild deployed: modern landing, registration redirect normalization, profile VIP gate panel, gift-code surface, SPA route fallback, and deploy script exact-tag rollout fix
- [x] 2026-06-12 VIP backend implemented: authenticated checkout endpoint, payments callback handler, gift-code redemption, participant claim on profile return, and frontend checkout/gift actions
- [x] 2026-06-12 Assignment submission implemented: authenticated StepSubmission create/update endpoint, late penalty report/bonus-day tracking, profile next-step activation, and Step page report form
- [x] 2026-06-12 payments-microservice registered Marathon integration: Kubernetes override secret supplies `marathon` callback API key mapping without exposing secret values
- [x] 2026-06-12 Production data source checked: no `marathon_export.json` or non-empty seed found under `/home/ssf/Documents`; active Marathon/Product/Gift/Step data still requires approved export or human-provided course data
- [x] 2026-06-12 Legacy portal exporter audited: current `speakasap-portal` exporter is a stub because the legacy DB was archived; historical exporter included participants/answers/winners and is not safe to run as-is under no-bulk-progress-export rules
- [x] 2026-06-12 Safe catalog-only loader added: `scripts/load-marathon-catalog.js` dry-runs by default, rejects user/progress keys, and creates only approved Marathon/Product/Gift/Step rows when run with `--apply`
- [x] 2026-06-12 Production readiness preflight added: `scripts/check-marathon-readiness.js` performs read-only DB/env checks for registration, VIP checkout, gift redemption, and assignment submission readiness
- [x] 2026-06-12 Runtime packaging fixed: Docker image now includes operational `scripts/*.js` so `npm run load:catalog` and `npm run check:readiness` are available inside the Marathon pod
- [x] 2026-06-12 Deploy readiness visibility added: `scripts/deploy.sh` runs the journey readiness preflight after rollout as a non-blocking warning phase
- [x] 2026-06-12 Public catalog readiness surfaced: `/api/v1/marathons/readiness` exposes safe catalog counts/missing classes and home/register UI now explains registration-closed state when production catalog data is absent
- [x] 2026-06-12 Landing closed-catalog CTAs corrected: language landing pages now show registration-status actions instead of start/upgrade promises when no active marathon is configured
- [x] 2026-06-12 Root and global navigation closed-catalog CTAs corrected: home hero and shared nav now show registration/status wording when production readiness reports registration closed
- [x] 2026-06-12 Legacy full-export loaders disabled: direct Node/Python marathon_export import paths now refuse to run because historical exports include participant progress and winners
- [x] 2026-06-12 Journey smoke verifier added: `npm run check:journey` checks public Marathon routes read-only by default and supports explicit guarded mutating registration/profile/VIP/gift/submission verification after catalog load
- [x] 2026-06-12 Journey smoke verifier guardrails tightened: checkout/gift/submission flags now fail without `--mutating` and authenticated smoke inputs instead of being silently skipped
- [x] 2026-06-12 Gift redemption closed-catalog UX corrected: `/gift` and the landing VIP panel now show readiness/status messaging instead of gift redemption actions when production has no active marathon or unused gift codes
- [x] 2026-06-12 Readiness preflight operator output hardened: database connection failures now show the in-pod Kubernetes command and HTTP journey fallback instead of a raw Prisma error
- [x] 2026-06-12 Assignment content readiness added: MarathonStep catalog rows now require approved `assignmentContent`, step/support pages render it as plain text, peer reports no longer inject HTML, and readiness/journey checks fail missing assignment content
- [x] 2026-06-12 Registration launch gate tightened: direct registration now requires a launch-ready language catalog and public CTAs/forms use the same `registrationOpen` readiness contract
- [x] 2026-06-12 VIP payment settlement guardrail added: checkout creates a `MarathonPaymentAttempt` ledger row and payment callbacks must match the issued order before unlocking VIP
- [x] 2026-06-12 VIP payment return UX added: profile detail now explains `payment=success` callback-settlement delay, confirmed VIP state, and cancelled checkout returns
- [x] 2026-06-12 Saved assignment report UX added: authenticated step pages now load the participant's existing submission/report and show saved state, late status, and bonus-day metadata before resubmission
- [x] 2026-06-12 Saved assignment report verification added: `npm run check:journey` can read an existing participant submission with explicit auth/IDs and verifies saved-report readback after mutating submission smoke checks
- [x] 2026-06-12 Profile assignment schedule UX added: profile detail now labels active/completed/late/locked/VIP-gated steps, shows due/saved timing, and links payment-blocked steps back to VIP options
- [x] 2026-06-12 Profile dashboard UX added: `/profile` now renders marathon cards with progress, current step, VIP/payment state, bonus days, and direct continuation actions
- [x] 2026-06-12 Login-return token capture centralized: frontend bootstrap now stores `marathon_token` before route effects run so direct returns to profile detail, gift redemption, and assignment pages can authenticate
- [x] 2026-06-12 Login-return route smoke coverage added: default journey verifier now checks direct profile-detail, assignment, and gift login-return URLs serve the SPA shell before catalog readiness
- [x] 2026-06-12 Registration login handoff hardened: registration success now sends unauthenticated participants to portal login with their exact `/profile/:marathonerId` return path, while existing token holders open the profile directly
- [x] 2026-06-12 Assignment submit login guard added: step report UI now requires profile participant context and a Marathon token before enabling report submission, with login preserving the exact step return path
- [x] 2026-06-12 Gift redemption login guard added: `/gift` now requires profile participant context and a Marathon token before gift-code redemption, with login preserving the exact participant return path
- [x] 2026-06-12 VIP checkout login handoff added: profile checkout now redirects expired/unauthenticated sessions through portal login with `/profile/:marathonerId#vip-access` preserved instead of showing a generic 401
- [x] 2026-06-12 Profile dashboard error state added: `/profile` now separates login-required from profile load failures and gives refresh/support actions instead of treating backend errors as unauthenticated
- [x] 2026-06-12 Profile detail error state added: `/profile/:marathonerId` now separates 404 not-found from profile load failures and gives refresh/support actions instead of claiming the marathon is missing
- [x] 2026-06-12 Assignment step error state added: `/steps/:stepId` now separates 404 not-found from assignment load failures and gives refresh/support actions instead of claiming the step is missing
- [x] 2026-06-12 Language landing error state added: `/:langSlug/` now separates primary API/readiness load failures from closed-catalog fallback state and gives refresh/support actions
- [x] 2026-06-12 Empty language marathon response handled: `/:langSlug/` treats the current 200 empty by-language response as no active catalog instead of a landing outage
- [x] 2026-06-12 Home readiness error state added: `/` now separates readiness API load failures from closed-catalog state while keeping winners/reviews teasers optional
- [x] 2026-06-12 Registration and gift readiness error states added: `/register` and `/gift` now separate readiness API load failures from closed-catalog/gift-unavailable states, and gift redemption stays blocked until readiness is verified
- [x] 2026-06-12 Global registration CTA readiness state added: shared navigation now separates readiness API load failures from normal closed-catalog `Скоро` state and points users to registration status details
- [x] 2026-06-12 Catalog loader launch-ready validation tightened: default catalog dry runs now require an active marathon, trial step, gated step, VIP product, and gift code before approved data can be treated as registration/payment/assignment ready
- [x] 2026-06-12 Participant progress report added: authenticated profile detail can generate a read-only assignment/VIP/bonus/payment-attempt report with JSON download, and journey smoke verifies the auth guard plus frontend report UI
- [x] 2026-06-12 Winner automation added: completed assignment submissions now reconcile participant finish state and user medal totals into `MarathonWinner`, with journey smoke covering the public leaderboard shape
- [x] 2026-06-12 Analytics dashboard added: `/api/v1/marathons/analytics` exposes aggregate catalog/registration/assignment/VIP/payment/gift/winner metrics and `/support` renders an operational dashboard without participant PII
- [x] 2026-06-12 Intent-preservation trace restored to remote scope: `docs/intent/` task, execution plan, context package, validation, governance, gate, ADR, and template artifacts are ready to enforce the documented pre-coding and deployment gates
- [x] 2026-06-12 Post-marathon NPS survey implemented: completed participants can save/update private NPS feedback from profile detail, analytics exposes aggregate survey metrics only, and support dashboard renders NPS health without comments or participant PII
- [x] 2026-06-12 RunLayer read-only bridge implemented: Marathon exposes safe `marathon:*` external task responses for readiness, analytics, and participant-engagement planning, and RunLayer routes the `marathon` task prefix to Marathon without exporting participant-private data
