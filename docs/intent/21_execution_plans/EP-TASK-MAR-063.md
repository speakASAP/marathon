# EP-TASK-MAR-063: Root Landing Production Journey

```yaml
id: EP-TASK-MAR-063
task: docs/intent/11_tasks/TASK-MAR-063-root-landing-production-journey.md
status: completed
created: 2026-06-13
last_updated: 2026-06-13
```

## Plan

1. Read current frontend routes, public API helpers, readiness docs, and refactor status.
2. Replace root `Home.tsx` with a production landing entry point that uses existing readiness/language/winner/review APIs.
3. Extend existing `landing.css` tokens and component styles instead of creating a second visual system.
4. Reconcile stale `PLAN.md` Phase 1 blocker wording with verified production-safe evidence.
5. Build the frontend and full application.
6. Deploy through the standard Marathon deploy script.
7. Verify production root landing, readiness, and public journey smoke.
8. Record validation evidence in `VAL-TASK-MAR-063` and close the task.

## Contract Checks

- API contract: read-only public endpoints only on root landing.
- Payment contract: no direct provider integration; VIP checkout stays profile-owned.
- Data contract: Kubernetes/shared PostgreSQL is the only operational source of truth.
- Security contract: no secrets or private participant content in docs, logs, or UI.
- Assignment contract: no raw HTML rendering changes.

## Rollback

If the landing build or production journey smoke fails, revert only the `Home.tsx`, `landing.css`, and TASK-MAR-063 documentation changes from this task, then redeploy the last known good image.

## Current Blocker

None. The follow-up image `localhost:5000/marathon:43cadbf` rolled out successfully after allowing sufficient pull/startup time, and validation is recorded in `VAL-TASK-MAR-063`.
