# VAL-TASK-MAR-072: Restore Legacy Completed-Step Progression

## Validation Plan

1. Inspect legacy `speakasap-portal` code, templates, and tests before editing current Marathon code.
2. Capture read-only live evidence for German participant `fc2f9975-9151-49df-9297-4228d7d2891b`.
3. Build backend and frontend.
4. Run static diff checks.
5. Verify read-only schedule output inside the pod after deploy.
6. Verify production route/profile behavior for the German participant.

## Pre-Change Evidence

Legacy code inspected:

- `speakasap-portal@2b532b87a3:marathon/models.py`
- `speakasap-portal@2b532b87a3:marathon/views/steps.py`
- `speakasap-portal@2b532b87a3:marathon/templates/marathon/common_rules.html`
- `speakasap-portal@2b532b87a3:marathon/templates/marathon/faq.html`
- `speakasap-portal@2b532b87a3:marathon/templates/marathon/report.html`
- `speakasap-portal@2b532b87a3:marathon/tests.py`

Legacy conclusion:

- `checked` was not an unlock gate.
- Previous completed report was the gate for creating/opening the next new stage.
- Existing opened answer rows remained navigable.

Live German participant before the fix:

- Participant: `fc2f9975-9151-49df-9297-4228d7d2891b`
- Language: `de`
- Paid: `true`
- Active: `true`
- Bonus days left: `7`
- Observed submissions: `8`
- Observed checked submissions among first 8: `0`
- Observed completed submissions among first 8: sequences `1-6`
- Observed opened incomplete submissions: sequences `7-8`
- Regression symptom: checked-step gate makes sequences after 1 render as closed even though existing submissions should remain open and completed-but-unchecked reports should stay navigable.

## Post-Change Evidence

Pre-deploy validation:

- Command: `git diff --check`
  - Result: passed.
- Command: `npm run build`
  - Result: passed (`tsc -p tsconfig.build.json`).
- Command: `npm run build:frontend`
  - Result: passed (`tsc -b && vite build`).
  - Built JS asset: `public/assets/index-CZLmmCrQ.js`.
  - Residual dependency debt: `npm ci` reported 6 audit vulnerabilities (1 low, 4 moderate, 1 high). This is pre-existing dependency debt, not introduced by the progression patch.

Deployment:

- Commit: `02cb4ed Restore legacy marathon progression gates`
- Command: `./scripts/deploy.sh 02cb4ed`
- Result: passed.
- Image: `localhost:5000/marathon:02cb4ed`
- Running pod: `marathon-66fc68c75c-hlv2j`, `1/1 Running`, `0` restarts at verification time.
- Readiness: passed; observed `13` active marathons, `377` steps, `377` steps with content.
- User-flow smoke: passed.
- Production smoke: passed; synthetic flow submitted `29` steps, finished participant, confirmed payment/gift, created winner/NPS rows, and printed only masked identifiers.

Post-deploy German participant schedule:

- Command: read-only schedule query inside deployed pod using `MeService.buildSchedule()`.
- Participant: `fc2f9975-9151-49df-9297-4228d7d2891b`
- Pod: `marathon-66fc68c75c-hlv2j`
- Result:
  - Sequences `1-6`: `completed`, `can_open=true`, no block reason.
  - Sequence `7`: `active`, `can_open=true`, no block reason.
  - Sequence `8`: `active`, `can_open=true`, no block reason.
  - Sequence `9`: `inactive`, `can_open=false`, `block_reason=previous_report_pending`.
- Live HTML route: `https://marathon.alfares.cz/profile/fc2f9975-9151-49df-9297-4228d7d2891b`
  - Served bundle: `/assets/index-CZLmmCrQ.js`.

## Remaining Risk

The German participant currently has two already-opened incomplete submissions, sequences `7` and `8`. The fix keeps both reachable because they already exist as opened work, while keeping never-opened sequence `9` locked until previous reports are completed. No participant data was mutated by this repair.
