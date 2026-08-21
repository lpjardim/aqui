-- CreateEnum
CREATE TYPE "HeroVariant" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "HeroEventType" AS ENUM ('HERO_EXPOSED', 'HERO_CTA_CLICKED', 'CHECKOUT_STARTED', 'PAYMENT_CLICKED', 'STRIPE_SESSION_CREATED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "heroExperimentDebug" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "heroVariant" "HeroVariant";

-- CreateTable
CREATE TABLE "HeroExperimentEvent" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "variant" "HeroVariant" NOT NULL,
    "eventType" "HeroEventType" NOT NULL,
    "metadata" JSONB,
    "isDebug" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeroExperimentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HeroExperimentEvent_variant_eventType_idx" ON "HeroExperimentEvent"("variant", "eventType");

-- CreateIndex
CREATE INDEX "HeroExperimentEvent_visitorId_idx" ON "HeroExperimentEvent"("visitorId");

-- CreateIndex
CREATE INDEX "Order_heroVariant_idx" ON "Order"("heroVariant");
