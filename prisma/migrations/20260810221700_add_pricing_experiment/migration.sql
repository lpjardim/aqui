-- CreateEnum
CREATE TYPE "PricingVariant" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "ExperimentEventType" AS ENUM ('PRICING_EXPOSED', 'PRICING_CTA_CLICKED', 'PRICING_TOGGLE_CHANGED', 'CHECKOUT_STARTED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "pricingExperimentDebug" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pricingVariant" "PricingVariant";

-- CreateTable
CREATE TABLE "ExperimentEvent" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "variant" "PricingVariant" NOT NULL,
    "eventType" "ExperimentEventType" NOT NULL,
    "metadata" JSONB,
    "isDebug" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExperimentEvent_variant_eventType_idx" ON "ExperimentEvent"("variant", "eventType");

-- CreateIndex
CREATE INDEX "ExperimentEvent_visitorId_idx" ON "ExperimentEvent"("visitorId");

-- CreateIndex
CREATE INDEX "Order_pricingVariant_idx" ON "Order"("pricingVariant");

