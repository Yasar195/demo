-- AlterEnum
ALTER TYPE "VoucherRedemptionStatus" ADD VALUE 'PARTIALLY_USED';

-- AlterTable
ALTER TABLE "user_purchased_vouchers" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "quantity_used" INTEGER NOT NULL DEFAULT 0;
