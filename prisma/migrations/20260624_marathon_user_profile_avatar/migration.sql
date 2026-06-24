-- Persist a public avatar fallback per Marathon user.
CREATE TABLE "MarathonUserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "avatarSource" TEXT NOT NULL DEFAULT 'generated',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarathonUserProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarathonUserProfile_userId_key" ON "MarathonUserProfile"("userId");
CREATE INDEX "MarathonUserProfile_avatarSource_idx" ON "MarathonUserProfile"("avatarSource");
