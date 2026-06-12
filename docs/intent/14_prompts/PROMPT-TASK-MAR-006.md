# PROMPT-TASK-MAR-006

Implement the read-only RunLayer bridge for Marathon. Add Marathon `POST /api/v1/tasks/execute` for safe aggregate task types, route `marathon:*` in RunLayer, register the Marathon project idempotently, update smoke validation, and keep all outputs free of participant-private data.
