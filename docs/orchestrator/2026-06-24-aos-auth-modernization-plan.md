# Marathon GDD Plan: Central AOS/Auth Adoption

Date: 2026-06-24
Repo: marathon
Owner role: Marathon consumer migration owner

## IPS Chain

Vision: Marathon users authenticate through the shared Alfares AOS/auth-microservice account system, not through a Marathon-specific identity form.
Goal Impact: Marathon participants can use the same account in SpeakASAP and other Alfares services; Marathon stops duplicating login/registration logic.
System: Marathon frontend, registration API, auth-client, profile access, smoke scripts, participant auth user binding.
Feature: central auth redirect/callback, contact provisioning, duplicate prevention, auth-bound participant records.
Task: migrate visible registration/login entrypoints to the central auth flow and keep backend participant creation bound to auth user ids.
Execution Plan: wait for auth contract, then replace local login/register UI with central auth links/callback handling; keep backend contact provisioning until full hosted auth registration is live.
Coding Prompt: modify only Marathon repo; do not touch legacy speakasap-portal; do not run backfill apply without approval; preserve existing dirty work.
Code: frontend auth/register/profile components, src/shared/auth-client.ts, src/registrations/**, scripts/smoke, docs.
Validation: build, user-flow smoke, production-safe smoke, profile no-loop checks.

## Current Findings

- New registration now requires phone and calls `/auth/register-contact` with `source=marathon`.
- Marathon accepts auth-microservice tokens via `/auth/validate` and also still has portal JWT fallback.
- Current frontend still contains Marathon-local registration UI.
- Backfill script exists but live apply is not approved.
- Repo currently has unrelated dirty files; workers must not revert them.

## Goals

G1: Central login redirect.
- Replace local login CTAs with central auth URL after WS-A publishes hosted login contract.
- Preserve `next`/profile return target.
- Prevent login/profile redirect loops.

G2: Central registration redirect.
- Target state: registration CTA sends user to central auth registration/login, then returns to Marathon with token and selected marathon context.
- Transitional state: backend continues contact provisioning through auth for direct API registration.

G3: Participant binding.
- Ensure every new `MarathonParticipant.userId` is an auth UUID.
- Preserve existing participant progress and VIP/payment flows.
- Keep legacy/non-UUID handling separate through future mapping, not overwrite.

G4: User backfill plan.
- Dry-run existing participants with email+phone, masked output only.
- Apply only after explicit approval, in bounded batches.

G5: Validation.
- Missing phone returns 400.
- Existing Marathon or auth user returns login-required conflict.
- New user reaches profile handoff and can authenticate after central login.
- Public user-flow and production-safe smoke pass.

## Deliverables

- `docs/orchestrator/2026-06-24-aos-auth-modernization-plan.md` with this plan.
- Central auth redirect/callback implementation after WS-A contract.
- Smoke updates and backfill dry-run report when approved.

## WS-B Consumer Handoff - 2026-06-24

Status: adapter prepared; current phone-required contact-provisioning registration remains active.

Auth contract evidence:
- Source of truth: `auth-microservice/docs/UNIFIED_AUTH_CONTRACT.md`.
- Hosted entry points: `https://auth.alfares.cz/login` and `https://auth.alfares.cz/register`.
- Return parameter: `return_url`; token handoff fragment includes `access_token`, `refresh_token`, `expires_at`, and `auth_method`.
- Consumer validation remains server-side `POST /auth/validate`.

Implemented consumer posture:
- Marathon frontend auth adapter now accepts central `access_token` fragment handoff and sanitizes auth handoff fragment parameters from the URL.
- Legacy `marathon_token` query/hash capture and `VITE_PORTAL_LOGIN_URL` fallback remain supported during transition.
- Login/profile entrypoints use configurable central Auth-hosted URLs and preserve Marathon return paths.
- Direct Marathon registration still requires phone and calls backend contact provisioning through `/auth/register-contact`.

Blockers / deferred switch:
- [UNKNOWN: WS-A deployment status for the Auth-hosted `/login` and `/register` browser UI in production beyond the contract doc.]
- [MISSING: owner-approved full replacement of Marathon-local phone form with Auth-hosted registration; current deployment must preserve phone-required contact provisioning.]
- [MISSING: approved live backfill apply for legacy participants; dry-run only until explicitly approved.]

Validation plan:
- Build Marathon after all parallel lanes finish: `git diff --check`, `npm run build`, `cd frontend && npm run build`.
- Read-only journey smoke must prove central Auth bundle markers: `access_token`, `return_url`, and Auth-hosted login URL.
- Mutating production-safe smoke remains gated and must not run without the existing explicit smoke inputs/secrets.

WS-B validation evidence:
- `git diff --check`: passed on the dirty remote worktree.
- `npm run build`: passed.
- `cd frontend && npm run build`: passed and emitted `public/assets/index-CDjKfauw.js`.
- Static built-bundle marker check passed for `access_token`, `refresh_token`, `return_url`, `auth.alfares.cz/login`, `auth.alfares.cz/register`, legacy `marathon_token`, `userBound`, and `tokenUsed`.
- Production journey smoke was not run after this local build because production still serves the previous undeployed bundle; run it after the integration owner deploys the final asset set.

## WS-F Hosted Auth Integration Verifier - 2026-06-24

Status: completed verifier patch; not deployed.

Verifier changes:
- `frontend/src/auth.ts` now preserves the full current return path by default (`pathname + search + hash`) and keeps hosted Auth redirects on `https://auth.alfares.cz/login` or `/register` with `return_url` and `client_id=marathon`.
- `frontend/src/pages/Profile.tsx` redirects unauthenticated `/profile` access to hosted Auth instead of remaining on the public catalog view; stale 401 tokens are cleared before hosted Auth redirect.
- `scripts/check-marathon-journey.js` now checks central Auth profile and step fragment return routes, including `/profile#access_token=...&refresh_token=...`.
- `scripts/check-marathon-user-flows.js` now asserts hosted Auth login/register, `return_url`, `client_id=marathon`, `access_token`, and `refresh_token` bundle markers.

Hosted Auth contract verification:
- Login URL source: `https://auth.alfares.cz/login`.
- Registration URL source: `https://auth.alfares.cz/register`.
- Client id: `marathon`.
- Return parameter: exact `return_url` built from Marathon origin plus current path/search/hash or explicit guarded route.
- Fragment handoff preserved: `#access_token=...&refresh_token=...&auth_method=...` is accepted and sanitized after token capture; legacy `marathon_token` remains supported during transition.
- Hosted registration remains phone-required for `client_id=marathon`; local direct registration still requires phone while contact provisioning remains active.

WS-F validation evidence:
- `git diff --check`: passed on the dirty remote worktree.
- `npm run build`: passed.
- `cd frontend && npm run build`: passed and emitted `public/assets/index-DoqV4JAy.js`.
- `node --check scripts/check-marathon-journey.js && node --check scripts/check-marathon-user-flows.js`: passed.
- `/tmp/marathon-wsf-marker-check.py`: passed for `public/assets/index-DoqV4JAy.js` with hosted Auth markers `auth.alfares.cz/login`, `auth.alfares.cz/register`, `return_url`, `client_id`, `marathon`, `access_token`, `refresh_token`, `auth_method`, legacy `marathon_token`, `/profile`, and `/steps/`.
- `npm run check:journey -- --base-url https://marathon.alfares.cz --json`: read-only checks reached production and passed health, frontend shell, catalog/schema, public routes, RunLayer aggregate tasks, central Auth profile/step return shells, progress/NPS auth guards, payment webhook auth guard, and landing assets; final result failed at `journey-error` because production still serves an undeployed bundle without the new central Auth marker assertion.

WS-F blockers / handoff:
- [BLOCKED: production bundle deployment] Production `https://marathon.alfares.cz` has not been deployed with `public/assets/index-DoqV4JAy.js`, so the updated journey smoke cannot pass against production until the integration owner deploys the final asset set.
- [MISSING: explicit deploy approval] No deploy was performed in WS-F.
- [MISSING: owner approval for mutating user-flow smoke] `scripts/check-marathon-user-flows.js` posts a registration in its normal path, so it was not run against production in this verifier lane.
- [MISSING: approved live backfill apply] Backfill remains approval-gated and out of scope for WS-F.


## Auth Contact-Code Update - 2026-06-24

Auth source now includes central `POST /auth/contact-code/request` and `POST /auth/contact-code/verify` for email or phone passwordless sign-in. Marathon must not add a local phone-code form. Marathon's responsibility remains:

- redirect unauthenticated users to hosted Auth with `client_id=marathon` and exact `return_url`;
- accept hosted Auth fragment handoff with `access_token` and `refresh_token`;
- require phone on registration through hosted Auth or the transitional direct contact-provisioning path;
- keep backfill behind the owner-approved dry-run/apply gates.

Remaining deployment gate: resolved by the WS-F approved production deployment recorded below; `check:journey` now passes the central Auth marker assertion against production.


## Forbidden Work

- Do not touch `speakasap-portal`.
- Do not run DB backfill apply without explicit approval.
- Do not revert dirty files made by others.
- Do not redesign unrelated Marathon UI.


## Runtime Deploy Evidence - 2026-06-24

Status: hosted Auth consumer bundle deployed to production.

- Deploy command: `SKIP_MUTATING_SMOKE=true ./scripts/deploy.sh aos-auth-hosted-20260624-1`.
- Image: `localhost:5000/marathon:aos-auth-hosted-20260624-1`.
- Rollout: `deployment/marathon` successfully rolled out.
- Readiness in deployed pod: `npm run check:readiness` reported `ready`.
- Mutating public user-flow and production smoke were explicitly skipped with `SKIP_MUTATING_SMOKE=true`.
- Read-only production verifier: `npm run check:journey -- --base-url https://marathon.alfares.cz --json` returned `ok:true`.
- Verified central Auth markers include profile/step return routes, `access_token`, `refresh_token`, `return_url`, `client_id=marathon`, registration handoff, auth guards, and `mutation-skipped`.

Remaining gates:

- [MISSING: owner approval for Gate 1 live read-only backfill dry-run].
- [MISSING: owner approval for backfill apply].
- [MISSING: owner-approved mutating user-flow smoke] if the owner wants production registration/payment smoke beyond read-only verification.

## WS-F Approved Production Deploy Evidence - 2026-06-24

Status: deployed after explicit owner approval in this verifier lane.

Deploy evidence:
- Pre-deploy validation: `git diff --check`, `npm run build`, and `cd frontend && npm run build` passed.
- Deploy command: `SKIP_MUTATING_SMOKE=true ./scripts/deploy.sh hosted-auth-wsf-20260624-001`.
- Deploy preflight: `python3 scripts/check-marathon-hosted-auth-contract.py` passed 10/10 checks.
- Image: `localhost:5000/marathon:hosted-auth-wsf-20260624-001`.
- Rollout: `deployment/marathon` successfully rolled out in namespace `statex-apps`.
- Active pod check: `marathon-557df64db4-2w5wf` was `1/1 Running`, `0` restarts, with deployment image `localhost:5000/marathon:hosted-auth-wsf-20260624-001`.
- Deploy readiness: in-pod `npm run check:readiness` reported `ready` with 13 active marathons, 377 steps, and all payment env checks passing.
- Mutating public user-flow and production smokes were skipped deliberately with `SKIP_MUTATING_SMOKE=true`.
- Post-deploy read-only verifier: `npm run check:journey -- --base-url https://marathon.alfares.cz --json` returned `ok:true` and `mutation-skipped`.

Remaining gates:
- [MISSING: owner-approved mutating user-flow smoke] if production registration/payment smoke is desired.
- [MISSING: owner-approved live backfill apply].

## WS-Marathon Hosted Auth Contract Guardrail - 2026-06-24

Status: source contract checker added; no application source changes made in this lane.

Guardrail command:

```bash
python3 scripts/check-marathon-hosted-auth-contract.py --json-report -
```

Checker scope:
- reads Marathon source files only; does not import application code, read `.env`, call services, query databases, deploy, or run mutating smoke;
- verifies hosted Auth login/register redirects use `https://auth.alfares.cz`, `client_id=marathon`, and `return_url`;
- verifies hosted fragment handoff captures `access_token`, sanitizes `refresh_token` and related auth fragment parameters, and keeps transitional `marathon_token` fallback allowed;
- verifies the transitional direct registration path still requires phone and existing-account conflicts surface login/password-reset options;
- forbids Marathon-local contact-code/passwordless implementations and legacy-only `speakasap.com` login as the primary path.

Validation evidence:
- `python3 scripts/check-marathon-hosted-auth-contract.py --json-report -`: passed with `ok:true`, 10 passed, 0 failed.
- `python3 -m py_compile scripts/check-marathon-hosted-auth-contract.py`: passed.
- `bash -n scripts/deploy.sh`: passed after wiring the checker into deploy preflight.
- `scripts/deploy.sh` now runs `python3 scripts/check-marathon-hosted-auth-contract.py` before cluster/build steps, so future Marathon rollouts are gated by the hosted Auth source contract.

Remaining gates:
- [MISSING: owner-approved live backfill apply].
- [MISSING: owner-approved mutating user-flow smoke].

## 2026-06-24 - Profile Callback No-Loop Guard

Status: source contract hardened for the reported `/profile/:marathonerId` loading-loop risk; no runtime deploy, live login, DB query, backfill, secret read, payment mutation, or legacy `speakasap-portal` access was performed.

IPS chain:
- Vision: Marathon profile access returns from central Auth reliably without circular redirects or indefinite loading.
- Goal Impact: users who land on `/profile/:marathonerId#access_token=...` can have the Auth token captured before route rendering, while unauthenticated users get a finite login/reset UI instead of an automatic loop.
- System: Marathon frontend hosted Auth adapter, profile route, profile API client, and source contract checker.
- Feature: deterministic profile callback no-loop guard.
- Task: extend `scripts/check-marathon-hosted-auth-contract.py` to prove the Auth fragment capture and profile route failure path are wired together.
- Execution Plan: checker/docs-only; preserve frontend behavior, avoid live credentials, and do not run backfill or deploy.
- Coding Prompt: require `captureTokenFromUrl()` before React render, `/profile/:marathonerId` route registration, Bearer-backed profile fetch, finite `MarathonAuthRequiredError` UI, hosted login return to the same profile, and password reset link.
- Code: `scripts/check-marathon-hosted-auth-contract.py` and this plan entry.
- Validation: `PYTHONPYCACHEPREFIX=/tmp/marathon-pycache python3 -m py_compile scripts/check-marathon-hosted-auth-contract.py`; `python3 scripts/check-marathon-hosted-auth-contract.py --json-report /tmp/marathon-hosted-auth-profile-loop.json` passed with `ok=true`, `15` passed, `0` failed.

Evidence:
- `frontend/src/main.tsx` calls `captureTokenFromUrl()` before `ReactDOM.createRoot`.
- `frontend/src/auth.ts` stores hosted `access_token`, removes hosted Auth fragment keys including `refresh_token`, and replaces browser history.
- `frontend/src/App.tsx` registers `/profile/:marathonerId` to `ProfileDetail`.
- `frontend/src/api/profileMarathon.ts` fetches `/api/v1/me/marathons/:marathonerId` through `authFetch` and maps HTTP `401` to `MarathonAuthRequiredError`.
- `frontend/src/pages/ProfileDetail.tsx` resolves `MarathonAuthRequiredError` into a finite unauthenticated panel with hosted login return and password reset links, not an automatic redirect from the unauthenticated render branch.

Remaining gates:
- [MISSING: owner-approved Marathon live DB dry-run/backfill apply].
- [MISSING: live credential/contact-code profile callback smoke with approved non-sensitive test account/contact].


## 2026-06-24 - Backfill Reconciliation Apply Guardrail

Status: source guardrail and templates hardened for Auth/AOS user reconciliation; no live DB query, backfill dry-run/apply, Auth API call, contact-code delivery, deployment, secret read, or legacy `speakasap-portal` access was performed.

IPS chain:
- Vision: Marathon Auth migration keeps user reconciliation explicit, reviewable, and owned by approved Auth/AOS backfill gates.
- Goal Impact: already-bound participant reconciliation cannot be accidentally applied under the generic backfill approval; it requires a separate owner approval signal.
- System: Marathon Auth backfill script, hosted Auth source contract checker, backfill runbook, and Gate 2 apply template.
- Feature: fail-closed `--include-bound` reconciliation apply guard.
- Task: require `MARATHON_AUTH_RECONCILIATION_APPROVAL=OWNER_APPROVED_MARATHON_AUTH_RECONCILIATION_2026_06_24` whenever `--include-bound` is combined with `--apply`.
- Execution Plan: source/docs/checker only; keep plan-only and dry-run behavior non-mutating; avoid secrets, live DB reads, Auth API calls, deployment, and legacy SpeakASAP surfaces.
- Coding Prompt: add a source-level approval gate, expose the requirement in plan-only output, and make the hosted Auth checker fail if the gate is removed.
- Code: `scripts/backfill-marathon-auth-users.js`, `scripts/check-marathon-hosted-auth-contract.py`, `docs/orchestrator/2026-06-24-marathon-auth-backfill-runbook.md`, `docs/orchestrator/2026-06-24-marathon-auth-backfill-gate2-apply-approval-template.md`, and this plan entry.
- Validation: `node --check scripts/backfill-marathon-auth-users.js`; `PYTHONPYCACHEPREFIX=/tmp/marathon-pycache-auth-guard python3 -m py_compile scripts/check-marathon-hosted-auth-contract.py`; `node scripts/backfill-marathon-auth-users.js --plan-only --include-bound --limit 5` returned `liveAccess:false`, `dbAccess:false`, `authApiAccess:false`, and `reconciliationApplyRequires`; `python3 scripts/check-marathon-hosted-auth-contract.py --json-report /tmp/marathon-hosted-auth-reconciliation-guard.json` passed with `ok=true`, `17` passed, `0` failed, including `backfill-reconciliation-apply-approval-gate`; negative apply guard with placeholder env failed before live access with missing `MARATHON_AUTH_RECONCILIATION_APPROVAL`.

Remaining gates:
- [MISSING: owner-approved Gate 1 live read-only backfill dry-run].
- [MISSING: owner-approved Gate 2 backfill apply].
- [MISSING: owner-approved `--include-bound` reconciliation apply].
- [MISSING: approved non-sensitive live credential/contact-code callback smoke].
