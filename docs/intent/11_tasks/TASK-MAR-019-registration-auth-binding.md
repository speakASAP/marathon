# TASK-MAR-019: Bind Authenticated Registration to Portal User

```yaml
id: TASK-MAR-019
status: verified
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
upstream:
  - docs/intent/10_features/FEAT-001-launch-ready-catalog-flow.md
```

## Objective

Make registration bind a new participant to the authenticated portal user whenever a Marathon token is already present, so payment and assignment flows do not depend on a later unverified claim by participant ID alone.

## Scope

- Send the Marathon token with frontend registration requests when available.
- Validate optional registration bearer tokens on the backend.
- Persist `MarathonParticipant.userId` during registration when the token is valid.
- Return an explicit `userBound` flag from registration.
- Make mutating journey smoke fail when authenticated registration is not bound to the supplied token.

## Non-Goals

- Do not require authentication for anonymous first-time registration.
- Do not import or infer portal users from bulk progress exports.
- Do not expose JWTs, user secrets, or participant private data in validation.
- Do not load catalog data.

## Acceptance Criteria

- [x] Authenticated registration requests create participants with `userId` set.
- [x] Invalid registration bearer tokens return 401 instead of silently creating an unbound participant.
- [x] Frontend registration handles expired sessions by sending the participant through portal login.
- [x] Mutating journey smoke verifies `userBound=true` before profile/payment/assignment checks.
- [x] Build, deploy, Browser/API QA, and validation evidence are recorded.
