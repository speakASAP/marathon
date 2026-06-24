---
id: VAL-TASK-MAR-069
task: TASK-MAR-069
feature: FEAT-004
status: pending-final-evidence
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

[MISSING: final command output and deployed image tag.]
