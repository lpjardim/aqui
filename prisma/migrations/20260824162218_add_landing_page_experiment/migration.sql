-- CreateEnum
CREATE TYPE "LandingVariant" AS ENUM ('NORMAL', 'SALES', 'BLOG');

-- CreateEnum
CREATE TYPE "LandingEventType" AS ENUM ('EXPOSURE', 'PRICING_VIEW', 'CTA_CLICKED', 'PLAN_SELECTED', 'CHECKOUT_STARTED', 'PAYMENT_CLICKED', 'STRIPE_SESSION_CREATED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "landingExperimentDebug" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "landingExperimentVisitId" TEXT,
ADD COLUMN     "landingSessionId" TEXT,
ADD COLUMN     "landingVariant" "LandingVariant",
ADD COLUMN     "visitorId" TEXT;

-- CreateTable
CREATE TABLE "LandingExperimentEvent" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "experimentVisitId" TEXT NOT NULL,
    "variant" "LandingVariant" NOT NULL,
    "eventType" "LandingEventType" NOT NULL,
    "metadata" JSONB,
    "isDebug" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingExperimentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LandingExperimentEvent_variant_eventType_idx" ON "LandingExperimentEvent"("variant", "eventType");

-- CreateIndex
CREATE INDEX "LandingExperimentEvent_visitorId_idx" ON "LandingExperimentEvent"("visitorId");

-- CreateIndex
CREATE INDEX "LandingExperimentEvent_experimentVisitId_idx" ON "LandingExperimentEvent"("experimentVisitId");

-- CreateIndex
CREATE INDEX "Order_landingVariant_idx" ON "Order"("landingVariant");

-- CreateIndex
CREATE INDEX "Order_visitorId_idx" ON "Order"("visitorId");
