-- CreateTable
CREATE TABLE "MarathonPaymentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'checkout_requested',
    "providerPaymentId" TEXT,
    "checkoutResponse" JSONB,
    "callbackPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "MarathonPaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarathonPaymentAttempt_orderId_key" ON "MarathonPaymentAttempt"("orderId");

-- CreateIndex
CREATE INDEX "MarathonPaymentAttempt_participantId_idx" ON "MarathonPaymentAttempt"("participantId");

-- CreateIndex
CREATE INDEX "MarathonPaymentAttempt_status_idx" ON "MarathonPaymentAttempt"("status");

-- AddForeignKey
ALTER TABLE "MarathonPaymentAttempt" ADD CONSTRAINT "MarathonPaymentAttempt_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MarathonParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarathonPaymentAttempt" ADD CONSTRAINT "MarathonPaymentAttempt_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarathonProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
