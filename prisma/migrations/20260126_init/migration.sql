-- CreateTable
CREATE TABLE "Marathon" (
    "id" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "rulesTemplate" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "landingVideoUrl" TEXT,
    "vipGateDate" TIMESTAMP(3),
    "discountEndsAt" TIMESTAMP(3),
    "coverImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Marathon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarathonStep" (
    "id" TEXT NOT NULL,
    "marathonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "isPenalized" BOOLEAN NOT NULL DEFAULT true,
    "formKey" TEXT,
    "socialLink" TEXT,
    "isTrialStep" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarathonStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarathonParticipant" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "marathonId" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "vipRequired" BOOLEAN NOT NULL DEFAULT false,
    "paymentReported" BOOLEAN NOT NULL DEFAULT false,
    "bonusDaysLeft" INTEGER NOT NULL DEFAULT 7,
    "canUsePenalty" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "reportHour" TIMESTAMP(3) NOT NULL,
    "hasWarning" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "MarathonParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepSubmission" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenaltyReport" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completeTime" TIMESTAMP(3),
    "value" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PenaltyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarathonWinner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goldCount" INTEGER NOT NULL DEFAULT 0,
    "silverCount" INTEGER NOT NULL DEFAULT 0,
    "bronzeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarathonWinner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarathonGift" (
    "id" TEXT NOT NULL,
    "marathonId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "redeemedByUserId" TEXT,

    CONSTRAINT "MarathonGift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarathonProduct" (
    "id" TEXT NOT NULL,
    "marathonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "totalHours" INTEGER NOT NULL DEFAULT 50,

    CONSTRAINT "MarathonProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Marathon_slug_key" ON "Marathon"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MarathonStep_marathonId_sequence_key" ON "MarathonStep"("marathonId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "MarathonGift_code_key" ON "MarathonGift"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MarathonProduct_marathonId_key" ON "MarathonProduct"("marathonId");

-- AddForeignKey
ALTER TABLE "MarathonStep" ADD CONSTRAINT "MarathonStep_marathonId_fkey" FOREIGN KEY ("marathonId") REFERENCES "Marathon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarathonParticipant" ADD CONSTRAINT "MarathonParticipant_marathonId_fkey" FOREIGN KEY ("marathonId") REFERENCES "Marathon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepSubmission" ADD CONSTRAINT "StepSubmission_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MarathonParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepSubmission" ADD CONSTRAINT "StepSubmission_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "MarathonStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyReport" ADD CONSTRAINT "PenaltyReport_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MarathonParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarathonGift" ADD CONSTRAINT "MarathonGift_marathonId_fkey" FOREIGN KEY ("marathonId") REFERENCES "Marathon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarathonProduct" ADD CONSTRAINT "MarathonProduct_marathonId_fkey" FOREIGN KEY ("marathonId") REFERENCES "Marathon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
