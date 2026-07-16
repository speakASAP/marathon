-- Duplicate protection for marathon registration (Plan E, 2026-07-16).
-- Two concurrent identical registration requests must produce exactly one
-- active MarathonParticipant per (userId, marathonId).

-- Phase 1: hard-delete pure double-submit artifacts: unpaid, zero dependent
-- history, with a strictly older twin in the same active+unfinished group.
-- (Expected to remove exactly 2 rows as of 2026-07-16: f18f56d1-…, 04cb1a5a-….)
DELETE FROM "MarathonParticipant" p
USING "MarathonParticipant" keep
WHERE p."userId" IS NOT NULL
  AND keep."userId" = p."userId"
  AND keep."marathonId" = p."marathonId"
  AND p.active = true AND p."finishedAt" IS NULL
  AND keep.active = true AND keep."finishedAt" IS NULL
  AND keep."createdAt" < p."createdAt"
  AND p.paid = false
  AND NOT EXISTS (SELECT 1 FROM "StepSubmission" s WHERE s."participantId" = p.id)
  AND NOT EXISTS (SELECT 1 FROM "MarathonPaymentAttempt" a WHERE a."participantId" = p.id)
  AND NOT EXISTS (SELECT 1 FROM "MarathonSurveyResponse" r WHERE r."participantId" = p.id)
  AND NOT EXISTS (SELECT 1 FROM "PenaltyReport" pr WHERE pr."participantId" = p.id);

-- Phase 2: deactivate remaining surplus duplicates, keeping exactly one active
-- row per (userId, marathonId): the paid one if any, else the earliest.
-- Deactivation (not deletion) preserves paid rows and dependent history
-- (all FKs are ON DELETE RESTRICT) and satisfies the partial index below.
-- NOTE: MarathonParticipant has no updatedAt column — nothing else to set.
WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY "userId", "marathonId"
    ORDER BY paid DESC, "createdAt" ASC, id ASC
  ) AS rn
  FROM "MarathonParticipant"
  WHERE active = true AND "finishedAt" IS NULL AND "userId" IS NOT NULL
)
UPDATE "MarathonParticipant" mp
SET active = false
FROM ranked
WHERE mp.id = ranked.id AND ranked.rn > 1;

-- Phase 3: enforce at the database level. Fails loudly if anything unresolved.
CREATE UNIQUE INDEX "MarathonParticipant_userId_marathonId_active_unfinished_key"
ON "MarathonParticipant" ("userId", "marathonId")
WHERE active = true AND "finishedAt" IS NULL AND "userId" IS NOT NULL;
