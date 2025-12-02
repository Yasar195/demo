/*
  Warnings:

  - You are about to drop the column `balance` on the `gift_cards` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `gift_cards` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `gift_cards` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `gift_cards` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `gift_cards` table. All the data in the column will be lost.
  - Added the required column `expires_at` to the `gift_cards` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `gift_cards` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `gift_cards` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "gift_cards" DROP COLUMN "balance",
DROP COLUMN "createdAt",
DROP COLUMN "deletedAt",
DROP COLUMN "expiresAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "is_real_card" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "value" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "user_purchased_vouchers" ADD COLUMN     "purchase_position" INTEGER;

-- CreateTable
CREATE TABLE "voucher_gift_card_mappings" (
    "id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "gift_card_id" TEXT NOT NULL,
    "position" INTEGER,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_delivered" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voucher_gift_card_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_gift_cards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gift_card_id" TEXT NOT NULL,
    "user_purchased_voucher_id" TEXT NOT NULL,
    "purchase_position" INTEGER NOT NULL,
    "scratch_code" TEXT,
    "is_revealed" BOOLEAN NOT NULL DEFAULT false,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_gift_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mapping_voucher_idx" ON "voucher_gift_card_mappings"("voucher_id");

-- CreateIndex
CREATE INDEX "mapping_giftcard_idx" ON "voucher_gift_card_mappings"("gift_card_id");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_gift_card_mappings_voucher_id_position_key" ON "voucher_gift_card_mappings"("voucher_id", "position");

-- CreateIndex
CREATE INDEX "user_giftcard_user_idx" ON "user_gift_cards"("user_id");

-- CreateIndex
CREATE INDEX "user_giftcard_card_idx" ON "user_gift_cards"("gift_card_id");

-- AddForeignKey
ALTER TABLE "voucher_gift_card_mappings" ADD CONSTRAINT "voucher_gift_card_mappings_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_gift_card_mappings" ADD CONSTRAINT "voucher_gift_card_mappings_gift_card_id_fkey" FOREIGN KEY ("gift_card_id") REFERENCES "gift_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_gift_cards" ADD CONSTRAINT "user_gift_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_gift_cards" ADD CONSTRAINT "user_gift_cards_gift_card_id_fkey" FOREIGN KEY ("gift_card_id") REFERENCES "gift_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_gift_cards" ADD CONSTRAINT "user_gift_cards_user_purchased_voucher_id_fkey" FOREIGN KEY ("user_purchased_voucher_id") REFERENCES "user_purchased_vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
