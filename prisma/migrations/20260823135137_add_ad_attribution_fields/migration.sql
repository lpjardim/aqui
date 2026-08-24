-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "attributionAdId" TEXT,
ADD COLUMN     "attributionAdsetId" TEXT,
ADD COLUMN     "attributionCampaignId" TEXT,
ADD COLUMN     "placement" TEXT,
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmContent" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmSource" TEXT,
ADD COLUMN     "utmTerm" TEXT;
