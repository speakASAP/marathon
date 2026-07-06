# Marathon Profile Centralization Lane A

Date: 2026-07-06
Owner role: remote-only Marathon worker
Scope: Marathon profile API/client source and profile-centralization documentation.

## Intent Preservation Chain

- Vision: Auth remains the reusable account and profile authority for the Alfares ecosystem while Marathon remains the language-marathon domain service.
- Goal Impact: Marathon no longer accepts local edits for reusable account contact fields on the authenticated profile card, reducing duplicate truth for email and phone without data migration.
- System: Marathon `me/profile` API, Marathon frontend profile settings, Auth token user payload from auth-microservice validation, and existing Marathon participant/profile tables.
- Feature: Auth-preferred profile contact read with Marathon-local public participant-card fields.
- Task: route reusable profile contact reads through the authenticated Auth user when available, keep legacy Marathon participant contact snapshots as read-only fallback, and bound Marathon-local profile writes to public display/avatar/bio fields.
- Execution Plan: change the `me/profile` controller/service to pass the full Auth user to profile reads/writes; remove `email` and `phone` from the Marathon profile update DTO; update frontend profile save payload and mark email/phone read-only in the Marathon profile UI.
- Coding Prompt: edit only Marathon profile API/client/docs; do not run DB backfills, do not deploy, do not edit Auth, do not output secrets or customer data.
- Code: `src/me/me.controller.ts`, `src/me/me.service.ts`, `frontend/src/api/profileMarathon.ts`, `frontend/src/pages/Profile.tsx`.
- Validation: `git diff --check` passed; `npm run build` passed; `npm run build:frontend` passed and emitted `public/assets/index-DQSLpIUV.js`; read-only live `npm run check:journey -- --base-url https://marathon.alfares.cz --json` failed at pre-existing/live `/api/v1/marathons/analytics` HTTP 500 after health/frontend/catalog/language/register/winners checks passed.

## Ownership Decision

Auth-owned reusable account/profile fields:

- email
- phone
- Auth display name components when available from token validation (`name`, `firstName`, `lastName`)

Marathon-local domain-only fields retained in this lane:

- `displayName` as the Marathon public participant/card and certificate default name, not general account identity
- `avatarUrl` as the Marathon public finalist/review avatar surface
- `bio` as Marathon-local profile card text
- participant progress, payment/VIP state, bonus days, report time, certificate confirmation, reviews, and NPS state

Existing `MarathonParticipant.email`, `MarathonParticipant.phone`, and `MarathonParticipant.name` remain compatibility snapshots for legacy registration, notifications, historical participants, and no-migration fallback. This lane does not remove or backfill them.

## Guardrails

- No DB backfill or destructive schema/data removal was performed.
- No Auth repository edits were performed.
- No production deploy was performed.
- No secrets, JWTs, raw customer data, participant exports, or contact values are recorded here.

## Remaining Blockers

- [MISSING: approved migration plan] before removing legacy participant contact columns or changing historical participant snapshots.
- [MISSING: confirmed Auth `/auth/profile` runtime adoption by Marathon beyond token validation payload] before Marathon can drop fallback participant contact reads.
