# Claude Instructions

Shared rules live here:

- Claude profile: `/home/ssf/.claude/CLAUDE.md`
- Shared ecosystem instructions: `/home/ssf/Documents/Github/CLAUDE.md`
- Codex profile: `/home/ssf/.codex/AGENTS.md`
- Cross-agent standard: `/home/ssf/.ai-agent-standards/CROSS_AGENT_AUTOMATION_STANDARD.md`
- Repository operations: `AGENT_OPERATIONS.md`

Read those first, then follow the repository-specific notes below and the current planning/status files.


## Repository-Specific Notes

# CLAUDE.md (marathon)

→ Ecosystem: [../shared/CLAUDE.md](../shared/CLAUDE.md) | Reading order: `BUSINESS.md` → `SYSTEM.md` → `SPEC.md` → `PLAN.md` → `AGENTS.md` → `TASKS.md` → `STATE.json`

---

## Knowledge Retrieval

Use `docs-rag-microservice` for bounded discovery when it is healthy, then
verify deployment, security, database, integration and public-contract facts
against the cited Git source. Git remains authoritative.

Authority and fallback rules:
`/home/ssf/Documents/Github/shared/docs/DOCUMENTATION_AUTHORITY.md`.

Do not generate tokens in documentation or assume an unconfident/failed RAG
response means that source documentation does not exist.

## marathon

**Purpose**: Standalone product for intensive learning marathon programs — course delivery, payments, and participant management.  
**Stack**: NestJS · Prisma · PostgreSQL · Redis

### Key constraints
- Never modify course content without human review
- Payment processing via payments-microservice only — never direct
- User progress data is private — no export without approval

### Key integrations
| Service | Usage |
|---------|-------|
| auth-microservice:3370 | User auth |
| payments-microservice:3468 | Course payments |
| notifications-microservice:3368 | Participant emails |

**Ops**: `kubectl logs -n statex-apps -l app=marathon -f` · `kubectl rollout restart deployment/marathon -n statex-apps` · `./scripts/deploy.sh`

## Legacy Behavior Reference

When Marathon behavior is unclear, or the modern service disagrees with expected product behavior, consult the legacy/old Marathon codebase and historical export before inventing a new rule. The legacy Marathon previously worked correctly; this repository is a modern refactor/migration and should preserve the old functional contract unless the user explicitly requests a product change. This applies especially to stage opening, bonus days, penalty circles, report submission/review state, schedule timing, and participant progress.
