# Marathon

Standalone marathon product (NestJS + TypeScript).

## Setup (production-only)

- Create `.env` from `.env.example`
- Build: `docker compose build`
- Run: `docker compose up -d`

## Deployment (blue/green)

- On **alfares** server (`ssh alfares`):
  - `cd ~/Documents/Github/marathon` (or repo root)
  - `./scripts/deploy.sh`

## Database

- Prisma schema in `prisma/schema.prisma`
- Generate client: `npm run prisma:generate`
- **Before first deploy:** create the `marathon` database on the shared PostgreSQL server (e.g. `database-server/scripts/create-database.sh` or `CREATE DATABASE marathon` as admin). The container runs `prisma migrate deploy` on startup to apply schema.

## Catalog Data

Registration and VIP verification require approved catalog rows in `Marathon`, `MarathonStep`, `MarathonProduct`, and optionally `MarathonGift`.

Use the safe catalog-only loader for human-approved source data:

```bash
npm run load:catalog -- /path/to/marathon-catalog.json
npm run load:catalog -- /path/to/marathon-catalog.json --apply
```

The loader is dry-run by default, rejects user/progress data, and does not overwrite existing catalog rows. See `docs/marathon-catalog-import.md`.

Run the read-only production preflight from the Marathon runtime after loading catalog data:

```bash
npm run check:readiness
npm run check:readiness -- --json
```

Run the HTTP-level journey smoke verifier after readiness passes:

```bash
npm run check:journey -- --base-url https://marathon.alfares.cz
```

The journey verifier is read-only by default. Registration, profile, VIP checkout, gift redemption, and assignment submission checks require explicit `--mutating` options; mutating-only flags fail without it. See `npm run check:journey -- --help`.

## Notes

- Production-only workflow
- Centralized logging via `LOGGING_SERVICE_URL`
- Nginx API routes in `nginx/nginx-api-routes.conf`
