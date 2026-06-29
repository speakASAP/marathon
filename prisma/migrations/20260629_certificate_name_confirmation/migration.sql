-- Require an explicit participant-name confirmation before issuing a Marathon certificate.
ALTER TABLE "MarathonParticipant"
  ADD COLUMN "certificateName" TEXT,
  ADD COLUMN "certificateNameConfirmedAt" TIMESTAMP(3);
