-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "lastPaidAdId" TEXT,
ADD COLUMN     "lastPaidAdsetId" TEXT,
ADD COLUMN     "lastPaidCampaignId" TEXT,
ADD COLUMN     "lastPaidPlacement" TEXT,
ADD COLUMN     "lastPaidUtmCampaign" TEXT,
ADD COLUMN     "lastPaidUtmContent" TEXT,
ADD COLUMN     "lastPaidUtmMedium" TEXT,
ADD COLUMN     "lastPaidUtmSource" TEXT,
ADD COLUMN     "lastPaidUtmTerm" TEXT;
