-- CreateIndex
-- Supports fast list query: WHERE (goldCount>0 OR silverCount>0 OR bronzeCount>0) ORDER BY goldCount DESC, silverCount DESC, bronzeCount DESC
CREATE INDEX "MarathonWinner_goldCount_silverCount_bronzeCount_idx" ON "MarathonWinner"("goldCount" DESC, "silverCount" DESC, "bronzeCount" DESC);
