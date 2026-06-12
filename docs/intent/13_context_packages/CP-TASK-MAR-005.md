# CP-TASK-MAR-005: NPS Survey Context

```yaml
id: CP-TASK-MAR-005
status: active
owner: Engineering
created: 2026-06-12
last_updated: 2026-06-12
```

## Relevant Files

- `prisma/schema.prisma`
- `src/me/me.controller.ts`
- `src/me/me.service.ts`
- `src/marathons/marathons.service.ts`
- `frontend/src/pages/ProfileDetail.tsx`
- `frontend/src/pages/Support.tsx`
- `scripts/check-marathon-journey.js`

## Invariants

- Authenticated participant ownership is required.
- Completed participant state is required for submission.
- Analytics must remain aggregate-only.
- Final launch remains blocked until catalog data exists.
