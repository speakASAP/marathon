# System: marathon

## Architecture

NestJS + Prisma + PostgreSQL + Redis. Blue/green deployment.

- Modules: courses, users, payments, notifications
- Deploy: `./scripts/deploy.sh`

## Integrations

| Service | Usage |
|---------|-------|
| auth-microservice:3370 | User auth |
| database-server:5432 | PostgreSQL + Redis |
| logging-microservice:3367 | Logs |
| notifications-microservice:3368 | User emails |
| payments-microservice:3468 | Course payments |

## Current State
<!-- AI-maintained -->
Stage: active

## Known Issues
<!-- AI-maintained -->
- None
