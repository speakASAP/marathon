-- Rename the old free-access participant contract to a marathon-level paid flag.
ALTER TABLE "MarathonParticipant" ADD COLUMN "paid" BOOLEAN NOT NULL DEFAULT false;

UPDATE "MarathonParticipant"
SET "paid" = (NOT "isFree") OR "paymentReported";

ALTER TABLE "MarathonParticipant"
  DROP COLUMN "isFree",
  DROP COLUMN "vipRequired",
  DROP COLUMN "paymentReported";

ALTER TABLE "Marathon"
  DROP COLUMN "vipGateDate";
