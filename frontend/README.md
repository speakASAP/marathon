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

## Legacy UI parity (assets)

To match the legacy marathon look (speakasap-portal; see `speakasap/docs/refactoring/MARATHON_LEGACY_UI_REFACTOR_PLAN.md` in the docs repo), run from **marathon repo root** (with speakasap-portal at `../speakasap-portal`):

```bash
./scripts/copy-legacy-assets.sh
```

This copies into `frontend/public/img/` (and thus into `public/` on build):

- `img/bg/` — hero backgrounds per language (`de.jpg`, `en.jpg`, etc.).
- `img/landing/` — circle icons (grammar, materials, talk, result), step images, adv icons.
- `img/certificates/` — gold/silver/bronze if present in portal static.

Then run `npm run build:frontend`. Without assets, hero uses gradient fallback and some images may 404.
