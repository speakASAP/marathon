# CLAUDE.md (marathon)

Ecosystem defaults: sibling [`../CLAUDE.md`](../CLAUDE.md) and [`../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md`](../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md).

Read this repo's `BUSINESS.md` → `SPEC.md` → `PLAN.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json` first.

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

### Quick ops
```bash
docker compose logs -f
./scripts/deploy.sh
```
