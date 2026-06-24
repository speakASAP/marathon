---
id: EP-TASK-MAR-069
task: TASK-MAR-069
feature: FEAT-004
status: implemented
---

# Execution Plan: Support-Chat Knowledge Base

## Workstreams

### A. Knowledge Contract

Owner: architecture agent.
Status: complete.

- Define safe knowledge sources.
- Exclude PII, raw reports, payment internals, gift codes, JWTs, secrets, and raw NPS comments.
- Define stable `support-chat-knowledge-v1` version marker.

### B. Runtime Knowledge Service

Owner: backend agent.
Status: complete.

- Add `MarathonKnowledgeService`.
- Load catalog readiness, analytics, active marathons, language list, and active-marathon step summaries.
- Cache snapshots briefly and fall back to the last good snapshot.
- Build prompt context from sanitized aggregate and catalog data.

### C. Support Chat Integration

Owner: backend agent.
Status: complete.

- Inject the knowledge service into support chat.
- Keep guardrail refusals before model calls.
- Add `knowledge_version` to in-scope answers.
- Keep static safe fallback when model or knowledge context is unavailable.

### D. Validation

Owner: validation agent.
Status: complete.

- Extend journey smoke for knowledge version and duration fact.
- Run TypeScript/build checks.
- Deploy and run production journey smoke.

## Shared Contracts

- `knowledge_version` is `support-chat-knowledge-v1`.
- Prompt context is aggregate/catalog-only.
- User-specific support remains outside this task unless authenticated and explicitly implemented later.

## Merge Order

1. Intent artifacts.
2. Runtime knowledge service.
3. Support-chat module/service integration.
4. Smoke-check updates.
5. Build, deploy, production smoke.
