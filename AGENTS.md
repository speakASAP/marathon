# Repository Agent Instructions

Shared rules live here:

- Codex profile: `/home/ssf/.codex/AGENTS.md`
- Cross-agent standard: `/home/ssf/.ai-agent-standards/CROSS_AGENT_AUTOMATION_STANDARD.md`
- Repository operations: `AGENT_OPERATIONS.md`

Read those first, then follow the repository-specific notes below and the current planning/status files.


## Repository-Specific Notes

# Agents: marathon

## Knowledge Retrieval

Use `docs-rag-microservice` for bounded discovery when it is healthy, then
verify deployment, security, database, integration and public-contract facts
against the cited Git source. Git remains authoritative.

Authority and fallback rules:
`/home/ssf/Documents/Github/shared/docs/DOCUMENTATION_AUTHORITY.md`.

Do not generate tokens in documentation or assume an unconfident/failed RAG
response means that source documentation does not exist.

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

## Legacy Behavior Reference

When Marathon behavior is unclear, or the modern service disagrees with expected product behavior, consult the legacy/old Marathon codebase and historical export before inventing a new rule. The legacy Marathon previously worked correctly; this repository is a modern refactor/migration and should preserve the old functional contract unless the user explicitly requests a product change. This applies especially to stage opening, bonus days, penalty circles, report submission/review state, schedule timing, and participant progress.
