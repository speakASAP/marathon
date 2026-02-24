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

To match the legacy marathon look (speakasap-portal `templates/new/marathons/index.html`), copy assets into `marathon/public/`:

- `public/img/bg/` — hero backgrounds per language: `de.jpg`, `en.jpg`, `fr.jpg`, `es.jpg`, `it.jpg`, `tr.jpg`, `cz.jpg`, `pt.jpg`, `nl.jpg`, `pl.jpg`, `no.jpg` (from speakasap-portal `static/img/bg/` or equivalent).
- `public/img/landing/` — advantage icons `adv_1.png` … `adv_6.png`, optional `support.png` (from portal `marathon/static/img/` or `src/marathons/img/`).
- `public/img/certificates/` — `gold_en.png`, `silver_en.png`, `bronze_en.png` (from portal media or static).

Without these, the app still works: hero uses gradient fallback, advantage blocks show tinted placeholders, certificate img src may 404.
