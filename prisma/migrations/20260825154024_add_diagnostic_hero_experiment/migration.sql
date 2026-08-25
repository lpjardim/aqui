-- CreateEnum
CREATE TYPE "DiagnosticHeroVariant" AS ENUM ('PAIN', 'WORD_OF_MOUTH', 'GROWTH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DiagnosticEventType" ADD VALUE 'HERO_VIEWED';
ALTER TYPE "DiagnosticEventType" ADD VALUE 'HERO_CTA_CLICKED';

-- AlterTable
ALTER TABLE "DiagnosticEvent" ADD COLUMN     "heroVariant" "DiagnosticHeroVariant";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "diagnosticHeroExperimentDebug" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "diagnosticHeroVariant" "DiagnosticHeroVariant";

-- CreateIndex
CREATE INDEX "DiagnosticEvent_heroVariant_eventType_idx" ON "DiagnosticEvent"("heroVariant", "eventType");

-- CreateIndex
CREATE INDEX "Order_diagnosticHeroVariant_idx" ON "Order"("diagnosticHeroVariant");
