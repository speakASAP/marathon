# Marathon

Standalone marathon product (NestJS + TypeScript).

## Setup (production-only)

- Create `.env` from `.env.example`
- Build: `docker compose build`
- Run: `docker compose up -d`

## Deployment (blue/green)

- On **dev** server (`ssh dev`):
  - `cd ~/Documents/Github/marathon` (or repo root)
  - `./scripts/deploy.sh`

## Database

- Prisma schema in `prisma/schema.prisma`
- Generate client: `npm run prisma:generate`
- **Before first deploy:** create the `marathon` database on the shared PostgreSQL server (e.g. `database-server/scripts/create-database.sh` or `CREATE DATABASE marathon` as admin). The container runs `prisma migrate deploy` on startup to apply schema.

## Notes

- Production-only workflow
- Centralized logging via `LOGGING_SERVICE_URL`
- Nginx API routes in `nginx/nginx-api-routes.conf`
