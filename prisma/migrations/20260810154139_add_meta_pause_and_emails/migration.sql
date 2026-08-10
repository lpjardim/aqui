-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "completionEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "metaActivationEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "metaPauseLastError" TEXT,
ADD COLUMN     "metaPauseReason" TEXT,
ADD COLUMN     "metaPausedAt" TIMESTAMP(3),
ADD COLUMN     "nearTargetNotifiedAt" TIMESTAMP(3);
