/*
  Warnings:

  - You are about to drop the column `voucher_value` on the `voucher_requests` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `vouchers` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `vouchers` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `vouchers` table. All the data in the column will be lost.
  - You are about to drop the column `giftCardId` on the `vouchers` table. All the data in the column will be lost.
  - You are about to drop the column `isVerified` on the `vouchers` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `vouchers` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `vouchers` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `vouchers` table. All the data in the column will be lost.
  - Added the required column `quantity_total` to the `voucher_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `voucher_face_value` to the `voucher_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expires_at` to the `vouchers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `face_value` to the `vouchers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity_available` to the `vouchers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity_total` to the `vouchers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `selling_price` to the `vouchers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `vouchers` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VoucherCategory" AS ENUM ('FASHION', 'FURNITURE', 'ELECTRONICS', 'GROCERIES', 'FOOD_BEVERAGE', 'HEALTH_BEAUTY', 'SPORTS_FITNESS', 'HOME_GARDEN', 'ENTERTAINMENT', 'TRAVEL', 'AUTOMOTIVE', 'SERVICES', 'OTHER');

-- AlterTable
ALTER TABLE "voucher_requests" DROP COLUMN "voucher_value",
ADD COLUMN     "category" "VoucherCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "highlight_color" TEXT,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "quantity_total" INTEGER NOT NULL,
ADD COLUMN     "redemption_rules" TEXT,
ADD COLUMN     "voucher_face_value" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "vouchers" DROP COLUMN "createdAt",
DROP COLUMN "deletedAt",
DROP COLUMN "expiresAt",
DROP COLUMN "giftCardId",
DROP COLUMN "isVerified",
DROP COLUMN "price",
DROP COLUMN "updatedAt",
DROP COLUMN "value",
ADD COLUMN     "category" "VoucherCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "face_value" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "gift_card_id" TEXT,
ADD COLUMN     "highlight_color" TEXT,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quantity_available" INTEGER NOT NULL,
ADD COLUMN     "quantity_total" INTEGER NOT NULL,
ADD COLUMN     "redemption_rules" TEXT,
ADD COLUMN     "selling_price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "voucher_request_category_idx" ON "voucher_requests"("category");

-- CreateIndex
CREATE INDEX "voucher_category_idx" ON "vouchers"("category");

-- CreateIndex
CREATE INDEX "voucher_active_idx" ON "vouchers"("is_active");
