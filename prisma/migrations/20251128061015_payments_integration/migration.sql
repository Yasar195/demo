/*
  Warnings:

  - Added the required column `purpose` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('VOUCHER');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "purpose" "PaymentPurpose" NOT NULL,
ADD COLUMN     "voucherRequestId" TEXT;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_voucherRequestId_fkey" FOREIGN KEY ("voucherRequestId") REFERENCES "voucher_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
