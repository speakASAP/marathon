---
id: PROMPT-TASK-MAR-069
task: TASK-MAR-069
feature: FEAT-004
status: implemented
---

# Coding Prompt: TASK-MAR-069

Implement a full Marathon knowledge context for `POST /api/v1/support/chat`.

Requirements:

- Add a dedicated `MarathonKnowledgeService`.
- Build a safe snapshot from Marathon catalog, readiness, analytics, languages, and step summaries.
- Cache the snapshot briefly and preserve a last-good fallback.
- Inject the service into `SupportChatService`.
- Keep support guardrails before model calls.
- Add `knowledge_version=support-chat-knowledge-v1` for in-scope responses.
- Never place PII, raw reports, payment secrets, gift codes, checkout URLs, JWTs, or raw NPS comments in prompt context.
- Extend journey smoke to verify the knowledge marker and the 30-day duration fact.
