# Repository Agent Instructions

Shared rules live here:

- Codex profile: `/home/ssf/.codex/AGENTS.md`
- Cross-agent standard: `/home/ssf/.ai-agent-standards/CROSS_AGENT_AUTOMATION_STANDARD.md`
- Repository operations: `AGENT_OPERATIONS.md`

Read those first, then follow the repository-specific notes below and the current planning/status files.


## Repository-Specific Notes

# Agents: marathon

## Knowledge Retrieval (query before reading files)
Query the RAG service first to reuse indexed ecosystem context before reading raw files:

```bash
curl -s -X POST http://docs-rag-microservice.statex-apps.svc.cluster.local:3397/retrieval/agent-context \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR QUESTION HERE", "maxTokens": 3000}'
```

- Internal URL: `http://docs-rag-microservice.statex-apps.svc.cluster.local:3397`
- Public URL: `https://docs-rag.alfares.cz`
- Full guide: `docs-rag-microservice/docs/RAG_USAGE.md`

## Coordinator Config

```yaml
model_tier: cheap
cycle_interval_minutes: 120
max_tasks_per_cycle: 5
```

## Worker Pool Config

```yaml
max_concurrent_workers: 2
default_model_tier: free
allowed_mcp_servers: [filesystem, postgres]
```

## Agent Reading Order

`BUSINESS.md` → `SPEC.md` → `PLAN.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json`

## Typical Task Types

| Task Type | Target | Description |
|-----------|--------|-------------|
| `generate_participant_progress_report` | internal | Aggregate completion stats per marathon |
| `send_participant_reminder` | notifications-microservice:3368 | Nudge inactive participants |
| `review_course_content` | human handoff | Flag steps for human review — AI never edits |

## Anti-Chaos Rules

- AI must never modify `MarathonStep` content (title, formKey, sequence) — human review only.
- AI must never process or trigger payments directly.
- AI must never export bulk user progress data (`StepSubmission`, `PenaltyReport`).
- AI must never cancel or refund participant records without explicit human approval.

## Active Agents
<!-- Coordinator-maintained -->
