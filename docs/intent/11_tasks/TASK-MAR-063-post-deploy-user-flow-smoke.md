# TASK-MAR-063: Post-Deploy User Flow Smoke

## Status

Implemented

## Intent Trace

- Vision goal: VG-004 support operationally verified releases.
- System: SYS-001 Marathon platform.
- Subsystems: SUB-001 registration catalog, SUB-002 VIP payments.

## Problem

Deployment currently checks backend readiness but does not run a post-deploy smoke that follows the public visitor, registration, and payment-entry journeys from the user's point of view.

## Scope

- Add a post-deploy user-flow smoke script.
- Cover public page traversal, new-user registration, and VIP checkout boundary.
- Wire the smoke into `scripts/deploy.sh` after rollout.
- Keep sensitive values masked and avoid submitting real payment details.

## Non-Goals

- Do not execute real card payment.
- Do not print JWTs, payment keys, full participant IDs, or full smoke emails.
- Do not require a browser package in the production container.

## Acceptance Criteria

- `npm run check:user-flows` verifies public user routes and primary navigation/action markers.
- When registration is open, the script creates a generated `example.invalid` smoke registration and verifies the profile handoff route.
- Checkout is tested as an authenticated boundary when a smoke token is available and as a protected unauthenticated boundary otherwise.
- `scripts/deploy.sh` runs the user-flow smoke after rollout.
- Full production mutating smoke remains available through `npm run check:production-smoke`.
