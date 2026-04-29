# Agents: marathon

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
None — awaiting business-orchestrator onboarding (see GOALS.md Phase 5).
