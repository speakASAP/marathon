# Marathon Admin Pricing Plan

Date: 2026-06-24
Repo: marathon
Owner role: integration worker
Status: implemented, validation pending

## Intent Preservation Chain

- Vision: Marathon remains a production-ready learning platform with server-side VIP pricing and payment integrity.
- Goal Impact: administrators can update the launch VIP price across all active Marathon products without direct DB access, while payment callbacks continue to validate against the recorded checkout amount.
- System: Marathon NestJS API, Prisma `MarathonProduct`, React frontend, hosted Auth bearer token.
- Feature: admin pricing surface for active Marathon products.
- Task: add an authenticated admin route that lists the 13 active marathon products and updates their price in one operation.
- Execution Plan: add an env allowlist-backed admin API, a React admin page at `/admin/marathons/prices`, source contract checks, and compile validation.
- Coding Prompt: preserve current checkout behavior, do not expose secrets or participant data, update only `MarathonProduct.price/currency`, and deny admin API calls when the user is not in `MARATHON_ADMIN_USER_IDS` or `MARATHON_ADMIN_EMAILS`.
- Code: `src/admin/*`, `src/app.module.ts`, `frontend/src/api/adminMarathon.ts`, `frontend/src/pages/AdminMarathonPrices.tsx`, `frontend/src/App.tsx`, `frontend/src/index.css`, `scripts/check-marathon-admin-pricing-contract.py`, `package.json`.
- Validation: source contract, TypeScript backend build, frontend TypeScript/Vite build, and read-only readiness after deployment.

## Scope

Allowed files:

- `src/admin/*`
- `src/app.module.ts`
- `frontend/src/api/adminMarathon.ts`
- `frontend/src/pages/AdminMarathonPrices.tsx`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `scripts/check-marathon-admin-pricing-contract.py`
- `package.json`
- this plan file

Forbidden files:

- `prisma/schema.prisma` and migrations
- payment callback logic in `src/vip/*`
- participant, submission, gift, winner, and support-chat data paths
- deployment manifests
- production data exports or raw secrets

## Admin Contract

Admin identity is server-side only:

- `MARATHON_ADMIN_USER_IDS`: comma-separated Auth user IDs.
- `MARATHON_ADMIN_EMAILS`: comma-separated Auth emails.

When neither env var contains the authenticated user, the admin API returns `403`.

The API updates only active Marathon products:

- `GET /api/v1/admin/marathons/prices`
- `PATCH /api/v1/admin/marathons/prices`

`PATCH` body:

```json
{
  "price": "49.00",
  "currency": "EUR",
  "expectedActiveCount": 13
}
```

`expectedActiveCount` is optional but the UI sends it so the operator does not accidentally update a different active catalog size.

## Parallel Execution

Workstreams:

| Workstream | State | Owner | Scope | Dependencies | Validation |
|---|---|---|---|---|---|
| Admin API | ready now | backend worker | `src/admin/*`, `src/app.module.ts` | existing AuthGuard and Prisma schema | backend build, contract checker |
| Admin UI | dependency-gated | frontend worker | `frontend/src/api/adminMarathon.ts`, `frontend/src/pages/AdminMarathonPrices.tsx`, `frontend/src/App.tsx`, CSS | Admin API response contract | frontend build, contract checker |
| Integration | final integration | original thread | package script, validation, deploy decision | API and UI patches | source contract plus builds |

Shared contracts:

- `GET/PATCH /api/v1/admin/marathons/prices`
- `MARATHON_ADMIN_USER_IDS` / `MARATHON_ADMIN_EMAILS`
- `MarathonProduct.price` and `currency`

Integration owner: original thread.
Validation owner: original thread.
Merge order: Admin API, Admin UI, source checker, compile validation, deploy only after dirty-worktree review.

## Open Items

- [MISSING: production admin allowlist env values]
- [MISSING: deployment approval after reviewing existing unrelated dirty worktree changes]
