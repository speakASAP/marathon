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

## Remaining Risk

[MISSING: deployment and post-deploy route evidence]
