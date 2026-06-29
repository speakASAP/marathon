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

## Knowledge Retrieval — docs-rag-microservice (MANDATORY, query before reading files)

**Query the RAG before reading source files** — saves 2000-5000 tokens per answer.

```bash
./scripts/query-docs-rag.sh "YOUR QUESTION HERE" 3000
```

The helper uses `JWT_TOKEN` injected into `deployment/marathon` from Kubernetes Vault through `marathon-secret`; do not use local token files or print the token.

---

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
