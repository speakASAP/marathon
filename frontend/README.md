# Marathon frontend (SPA)

Vite + React + TypeScript. Build output goes to `../public` so NestJS serves the app at marathon.alfares.cz.

## Commands

- `npm run dev` — dev server (proxy API to marathon backend if needed)
- `npm run build` — build to `../public`
- From repo root: `npm run build:frontend` — install deps and build

## Routes

- `/` — Home (links to landings + winners)
- `/winners` — Winners list (paginated)
- `/:langSlug/` — Language landing (e.g. `/german/`)

See `docs/refactoring/MARATHON_FRONTEND_REFACTORING.md` for full plan.
