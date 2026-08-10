-- CreateEnum
CREATE TYPE "BillingFrequency" AS ENUM ('ONE_TIME', 'MONTHLY');

-- CreateEnum
CREATE TYPE "DeliveryCycleStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- AlterTable
ALTER TABLE "CampaignUpdate" ADD COLUMN     "cycleId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "billingFrequency" "BillingFrequency" NOT NULL DEFAULT 'ONE_TIME',
ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT;

-- CreateTable
CREATE TABLE "DeliveryCycle" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "targetViews" INTEGER NOT NULL,
    "deliveredViews" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "DeliveryCycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetReachedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "metaPausedAt" TIMESTAMP(3),
    "metaPauseReason" TEXT,
    "metaPauseLastError" TEXT,
    "metaResumedAt" TIMESTAMP(3),
    "nearTargetNotifiedAt" TIMESTAMP(3),
    "completionEmailSentAt" TIMESTAMP(3),
    "stripeInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryCycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryCycle_stripeInvoiceId_key" ON "DeliveryCycle"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "DeliveryCycle_orderId_idx" ON "DeliveryCycle"("orderId");

-- CreateIndex
CREATE INDEX "DeliveryCycle_status_idx" ON "DeliveryCycle"("status");

-- CreateIndex
CREATE INDEX "CampaignUpdate_cycleId_idx" ON "CampaignUpdate"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeSubscriptionId_key" ON "Order"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "DeliveryCycle" ADD CONSTRAINT "DeliveryCycle_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignUpdate" ADD CONSTRAINT "CampaignUpdate_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "DeliveryCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill de dados: cria 1 DeliveryCycle por Order já existente, copiando
-- os valores atuais de entrega/pausa/target para o novo modelo. Nenhuma
-- encomenda existente perde histórico. `billingFrequency` já assume
-- ONE_TIME por defeito na coluna acima, cobrindo automaticamente estas
-- encomendas antigas.
INSERT INTO "DeliveryCycle" (
  "id",
  "orderId",
  "targetViews",
  "deliveredViews",
  "startsAt",
  "endsAt",
  "status",
  "targetReachedAt",
  "completedAt",
  "metaPausedAt",
  "metaPauseReason",
  "metaPauseLastError",
  "nearTargetNotifiedAt",
  "completionEmailSentAt",
  "createdAt",
  "updatedAt"
)
SELECT
  'seed' || substr(md5(random()::text || clock_timestamp()::text || "Order"."id"), 1, 21),
  "Order"."id",
  "Order"."visualizationsPurchased",
  "Order"."visualizationsDelivered",
  "Order"."createdAt",
  "Order"."createdAt",
  CASE WHEN "Order"."status" = 'COMPLETED' THEN 'COMPLETED'::"DeliveryCycleStatus" ELSE 'ACTIVE'::"DeliveryCycleStatus" END,
  "Order"."targetReachedAt",
  CASE WHEN "Order"."status" = 'COMPLETED' THEN "Order"."updatedAt" ELSE NULL END,
  "Order"."metaPausedAt",
  "Order"."metaPauseReason",
  "Order"."metaPauseLastError",
  "Order"."nearTargetNotifiedAt",
  "Order"."completionEmailSentAt",
  now(),
  now()
FROM "Order";

