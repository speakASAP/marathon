# CLAUDE.md (marathon)

→ Ecosystem: [../shared/CLAUDE.md](../shared/CLAUDE.md) | Reading order: `BUSINESS.md` → `SYSTEM.md` → `SPEC.md` → `PLAN.md` → `AGENTS.md` → `TASKS.md` → `STATE.json`

---

## Knowledge Retrieval — docs-rag-microservice (MANDATORY, query before reading files)

**Query the RAG before reading source files** — saves 2000-5000 tokens per answer.

```bash
kubectl -n statex-apps exec deployment/marathon -- curl -s -X POST http://docs-rag-microservice:3397/retrieval/agent-context \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat ~/.claude/rag-token)" \
  -d '{"query": "YOUR QUESTION HERE", "maxTokens": 3000}'
```


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

## Central Instruction Source

Shared agent rules now live in `/home/ssf/.claude/CLAUDE.md`, `/home/ssf/Documents/Github/CLAUDE.md`, `/home/ssf/.codex/AGENTS.md`, and `/home/ssf/.ai-agent-standards/CROSS_AGENT_AUTOMATION_STANDARD.md`. Keep this file for repository-specific Claude constraints only; do not duplicate shared operating rules here.
