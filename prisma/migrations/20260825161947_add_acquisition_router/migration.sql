-- CreateEnum
CREATE TYPE "FunnelFamily" AS ENUM ('LANDING', 'DIAGNOSTIC');

-- CreateEnum
CREATE TYPE "AcquisitionRouterEventType" AS ENUM ('ASSIGNMENT');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "acquisitionRouterDebug" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "acquisitionRouterExperimentId" TEXT,
ADD COLUMN     "funnelFamily" "FunnelFamily";

-- CreateTable
CREATE TABLE "AcquisitionRouterEvent" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "routerExperimentId" TEXT NOT NULL,
    "funnelFamily" "FunnelFamily" NOT NULL,
    "landingVariant" "LandingVariant",
    "eventType" "AcquisitionRouterEventType" NOT NULL,
    "metadata" JSONB,
    "isDebug" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcquisitionRouterEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcquisitionRouterEvent_funnelFamily_eventType_idx" ON "AcquisitionRouterEvent"("funnelFamily", "eventType");

-- CreateIndex
CREATE INDEX "AcquisitionRouterEvent_visitorId_idx" ON "AcquisitionRouterEvent"("visitorId");

-- CreateIndex
CREATE INDEX "Order_funnelFamily_idx" ON "Order"("funnelFamily");
