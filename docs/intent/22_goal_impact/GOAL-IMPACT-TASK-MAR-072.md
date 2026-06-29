# GOAL-IMPACT-TASK-MAR-072: Restore Legacy Completed-Step Progression

## Goal Impact

Participants must not lose access to completed or already-opened marathon work because review/checking has not happened yet. The German participant regression showed that using `isChecked` as an unlock gate collapses visible progress from several completed reports to one visible open step.

## User Impact

- Completed German stages 2 and 3 become navigable again.
- Opened current German stage work remains reachable.
- Future unopened stages stay blocked until previous reports are completed.
- Review checking remains visible as "Проверено" and continues to support winner/report quality.

## Business Impact

The Marathon product relies on daily momentum. Closing completed or opened stages after a backend refactor makes the user think their progress was lost and interrupts paid participant flow.

## Non-Goals

- No historical participant data rewrite.
- No payment-policy change.
- No medal or winner-policy change.
- No redesign of the profile UI.
