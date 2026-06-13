# CP-TASK-MAR-061: Smoke Data Isolation Context

Relevant files:

- `src/marathons/marathons.service.ts`
- `src/winners/winners.service.ts`
- `scripts/check-marathon-readiness.js`
- `scripts/check-marathon-journey.js`
- `prisma/schema.prisma`
- `docs/intent/12_validation/VAL-TASK-MAR-004.md`

Known production evidence before coding:

- Gift/winner/NPS production smoke passed on 2026-06-13 with a synthetic phone-only participant.
- Notifications DB had zero Marathon registration or smoke notification rows in the checked window.
- Synthetic NPS currently dominates NPS analytics if not filtered.
- Synthetic winner exists but is not top-page visible; it should still be excluded from public winner outputs.
