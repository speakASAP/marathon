# VAL-TASK-MAR-071: Step Schedule Next Unopened Control

## Validation Plan

1. Inspect legacy rules in `speakasap-portal` templates.
2. Inspect live participant schedule for the screenshot `marathonerId`.
3. Build the frontend after the code change.
4. Deploy and verify the public step page after rollout.

## Evidence

- Legacy rules inspected:
  - `speakasap-portal/marathon/templates/marathon/common_rules.html`
  - `speakasap-portal/marathon/templates/marathon/faq.html`
  - `speakasap-portal/marathon/templates/marathon/report.html`
- Live participant evidence, read-only:
  - Completed steps: sequences 1-6.
  - Active unfinished draft: sequence 7.
  - Next unopened target: sequence 8, expected start `2026-07-04T11:00:00Z` / 4 July 2026 13:00 Prague time.
- Build:
  - Command: `npm run build:frontend`
  - Result: passed.
- Deploy:
  - Command: `SKIP_MUTATING_SMOKE=true ./scripts/deploy.sh step-schedule-20260629-0800`
  - Result: passed.
  - Image: `localhost:5000/marathon:step-schedule-20260629-0800`
  - Readiness: passed for 13 active marathons and 377 steps with content.
- Backend deadline reconciliation deploy:
  - Command: `SKIP_MUTATING_SMOKE=true ./scripts/deploy.sh step-schedule-deadlines-20260629-0815`
  - Result: passed.
  - Image at completion: `localhost:5000/marathon:step-schedule-deadlines-20260629-0815`.
  - Follow-up: a parallel deploy later changed the image tag to `localhost:5000/marathon:inline-exercise-20260629b`; the running pod still contains `deadlineReconciliation` code in `/app/dist/me/me.service.js`.
  - Candidate SQL validation: `make_interval(days => s.sequence)` query passed; recent 15-minute due window returned `0` candidates at validation time.
  - Startup log check: no deadline-loop errors; pod running with `0` restarts.
- Production title repair:
  - Dry-run matched exactly one row: `german-3`, sequence 8.
  - Updated title from `Этап 4. НИДЕРЛАНДСКИЙ язык. День 3. Передышка` to `Этап 4. Местоимения. Глагол sein (быть). День 3. Передышка`.
  - Updated `/home/ssf/Documents/marathon-import/marathon-catalog.generated.json` with exactly one replacement to prevent reload drift.
- Live route verification:
  - URL: `https://marathon.alfares.cz/steps/848916ef-bdb7-4824-9f87-92aa156866ec?marathonerId=fc2f9975-9151-49df-9297-4228d7d2891b`
  - Panel text: `Следующий этап, Этап 4. Местоимения. Глагол sein (быть). День 3. Передышка. Появится 4 июля в 13:00.`
  - Old text absent: `Следующий этап, Этап 2. Введение языка в вашу реальность`.
  - Old date absent: `Появится 28 июня`.
  - `Открыть следующий сейчас` absent because sequence 7 remains active/incomplete.
  - Rechecked after parallel deploy and the same panel text remained visible.

## Remaining Validation

- The background checker is a guarded polling reconciliation loop, not an external durable job queue. It processes only due deadlines in the recent lookback window to avoid immediately mutating historical overdue imports.
