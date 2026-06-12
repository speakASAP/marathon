CREATE TABLE "MarathonSurveyResponse" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarathonSurveyResponse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarathonSurveyResponse_participantId_key" ON "MarathonSurveyResponse"("participantId");
CREATE INDEX "MarathonSurveyResponse_score_idx" ON "MarathonSurveyResponse"("score");

ALTER TABLE "MarathonSurveyResponse"
ADD CONSTRAINT "MarathonSurveyResponse_participantId_fkey"
FOREIGN KEY ("participantId") REFERENCES "MarathonParticipant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
