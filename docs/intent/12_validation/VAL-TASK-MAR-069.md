---
id: VAL-TASK-MAR-069
task: TASK-MAR-069
feature: FEAT-004
status: validated
---

# Validation: TASK-MAR-069

## Required Checks

```bash
git diff --check
node --check scripts/check-marathon-journey.js
npm run build
npm run build:frontend
./scripts/deploy.sh
npm run check:journey -- --base-url https://marathon.alfares.cz --json
```

## Runtime Acceptance

- `POST /api/v1/support/chat` returns `knowledge_version=support-chat-knowledge-v1` for in-scope support questions.
- A duration question returns a non-refused answer containing the 30-day Marathon fact.
- Out-of-scope requests remain refused before knowledge loading.
- Production journey smoke passes after deploy.

## Evidence

- `git diff --check`: passed.
- `node --check scripts/check-marathon-journey.js`: passed.
- `npm run build`: passed.
- `npm run build:frontend`: passed.
- Deploy image: `localhost:5000/marathon:support-knowledge-ui-20260624-225426`.
- Kubernetes status: `marathon-c7499d94b-btz2w` running `1/1`, zero restarts at final check.
- Deploy readiness phase: passed.
- Public user-flow smoke: passed.
- Guarded production smoke: passed for registration, payment unlock, gift unlock, 29 submitted steps, winner reconciliation, and NPS create/update.
- `npm run check:journey -- --base-url https://marathon.alfares.cz --json`: passed.
- Direct support-chat duration check returned `knowledge_version=support-chat-knowledge-v1` and the canonical 30-day Marathon duration fact.
