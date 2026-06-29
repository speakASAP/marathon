# VAL-TASK-MAR-073: Close npm Audit Debt

## Pre-Change Evidence

Root audit before repair:

- Command: `npm audit --json`
- Result: `10` total vulnerabilities.
- Severity: `6` moderate, `4` high.
- Primary chains: Nest/Express/Multer/qs/path-to-regexp.

Frontend audit before repair:

- Command: `cd frontend && npm audit --json`
- Result: `6` total vulnerabilities.
- Severity: `1` low, `4` moderate, `1` high.
- Primary chains: Vite/esbuild/PostCSS/Babel/React Router.

## Changes Validated

Dependency versions after repair:

- `@nestjs/common`: `11.1.27`
- `@nestjs/core`: `11.1.27`
- `@nestjs/platform-express`: `11.1.27`
- `@nestjs/serve-static`: `5.0.5`
- `multer`: `2.2.0` via root npm override
- `vite`: `7.3.6`
- `@vitejs/plugin-react`: `5.1.1`
- `react-router-dom`: `6.30.4`
- `@babel/core`: `7.29.7`
- `postcss`: `8.5.16`

## Validation Evidence

Pre-deploy validation:

- Command: `npm audit --audit-level=low`
  - Result: `found 0 vulnerabilities`.
- Command: `cd frontend && npm audit --audit-level=low`
  - Result: `found 0 vulnerabilities`.
- Command: `npm run build`
  - Result: passed (`tsc -p tsconfig.build.json`).
- Command: `npm run build:frontend`
  - Result: passed (`tsc -b && vite build`).
  - Built JS asset: `public/assets/index-DAsPDMVB.js`.
  - Built CSS asset: `public/assets/index-BhdXczuJ.css`.

## Deployment Evidence

Deployment:

- Commit deployed: `af08fbc Close Marathon npm audit debt`.
- Command: `./scripts/deploy.sh af08fbc`.
- Image: `localhost:5000/marathon:af08fbc`.
- Image digest: `sha256:abd9c1230a170fc3c4b5c7954a65f8f65fcef5fe3359ac49027a82bde3005c02`.
- Rollout: `deployment "marathon" successfully rolled out`.
- Pod after deploy: `marathon-75f9cd46bf-824w5`, `1/1 Running`, `0` restarts.

Deploy validation:

- Hosted Auth contract preflight: `17/17` checks passed.
- Docker build root install: `found 0 vulnerabilities`.
- Docker runtime install with `--omit=dev`: `found 0 vulnerabilities`.
- Docker runtime Prisma install: `found 0 vulnerabilities`.
- Journey readiness: passed (`13` active marathons, `377` steps, `377` steps with content).
- User-flow smoke: passed.
- Production smoke: passed (`participantFinished: true`, `stepsSubmitted: 29`).
- Live profile HTML asset check:
  - JS: `/assets/index-DAsPDMVB.js`.
  - CSS: `/assets/index-BhdXczuJ.css`.
- Runtime container audit:
  - Command: `kubectl exec -n statex-apps deploy/marathon -- sh -lc "cd /app && npm audit --audit-level=low"`.
  - Result: `found 0 vulnerabilities`.

## Remaining Risk

No npm audit vulnerabilities remain in the root package or frontend package at validation time.

Known non-blocking warning: npm printed an allow-scripts notice for `esbuild`/Prisma during install/build. This is npm hardening guidance, not an audit vulnerability, and the production build plus smoke checks passed.
