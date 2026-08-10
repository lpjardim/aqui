-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "metaAdId" TEXT,
ADD COLUMN     "metaAdSetId" TEXT,
ADD COLUMN     "metaAdUrl" TEXT,
ADD COLUMN     "metaCampaignId" TEXT,
ADD COLUMN     "targetReachedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_metaAdId_idx" ON "Order"("metaAdId");
