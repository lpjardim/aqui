-- CreateEnum
CREATE TYPE "StripeCheckoutStatus" AS ENUM ('CREATED', 'EXPIRED', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExperimentEventType" ADD VALUE 'PAYMENT_CLICKED';
ALTER TYPE "ExperimentEventType" ADD VALUE 'STRIPE_SESSION_CREATED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "stripeCheckoutStatus" "StripeCheckoutStatus" NOT NULL DEFAULT 'CREATED';
