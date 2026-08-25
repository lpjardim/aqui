-- CreateEnum
CREATE TYPE "DiagnosticEventType" AS ENUM ('STARTED', 'QUESTION_ANSWERED', 'COMPLETED', 'RESULT_VIEWED', 'PREVIEW_STARTED', 'PREVIEW_COMPLETED', 'RECOMMENDATION_VIEWED', 'RECOMMENDED_PLAN_CLICKED', 'CHECKOUT_STARTED', 'PAYMENT_CLICKED', 'STRIPE_SESSION_CREATED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "diagnosticAnswers" JSONB,
ADD COLUMN     "diagnosticId" TEXT,
ADD COLUMN     "diagnosticVersion" TEXT,
ADD COLUMN     "funnelSource" TEXT,
ADD COLUMN     "recommendationId" TEXT,
ADD COLUMN     "recommendationModelVersion" TEXT;

-- CreateTable
CREATE TABLE "DiagnosticEvent" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "diagnosticId" TEXT NOT NULL,
    "eventType" "DiagnosticEventType" NOT NULL,
    "metadata" JSONB,
    "isDebug" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosticEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiagnosticEvent_eventType_idx" ON "DiagnosticEvent"("eventType");

-- CreateIndex
CREATE INDEX "DiagnosticEvent_visitorId_idx" ON "DiagnosticEvent"("visitorId");

-- CreateIndex
CREATE INDEX "DiagnosticEvent_diagnosticId_idx" ON "DiagnosticEvent"("diagnosticId");

-- CreateIndex
CREATE INDEX "Order_funnelSource_idx" ON "Order"("funnelSource");

-- CreateIndex
CREATE INDEX "Order_diagnosticId_idx" ON "Order"("diagnosticId");
