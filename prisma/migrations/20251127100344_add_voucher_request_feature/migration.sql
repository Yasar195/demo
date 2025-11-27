/*
  Warnings:

  - A unique constraint covering the columns `[request_id]` on the table `vouchers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `vouchers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `vouchers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `store_id` to the `vouchers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `vouchers` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VoucherRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "vouchers" ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "request_id" TEXT,
ADD COLUMN     "store_id" TEXT NOT NULL,
ADD COLUMN     "value" DOUBLE PRECISION NOT NULL;

-- CreateTable
CREATE TABLE "voucher_requests" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "voucher_name" TEXT NOT NULL,
    "voucher_description" TEXT,
    "voucher_value" DOUBLE PRECISION NOT NULL,
    "voucher_price" DOUBLE PRECISION NOT NULL,
    "voucher_code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "additional_notes" TEXT,
    "status" "VoucherRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "admin_comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "voucher_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "voucher_request_store_idx" ON "voucher_requests"("store_id");

-- CreateIndex
CREATE INDEX "voucher_request_status_idx" ON "voucher_requests"("status");

-- CreateIndex
CREATE INDEX "voucher_request_reviewed_by_idx" ON "voucher_requests"("reviewed_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_request_id_key" ON "vouchers"("request_id");

-- CreateIndex
CREATE INDEX "voucher_store_idx" ON "vouchers"("store_id");

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "voucher_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_requests" ADD CONSTRAINT "voucher_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_requests" ADD CONSTRAINT "voucher_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
