/*
  Warnings:

  - You are about to drop the column `user_purchased_voucher_id` on the `user_gift_cards` table. All the data in the column will be lost.
  - You are about to drop the `voucher_gift_card_mappings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "user_gift_cards" DROP CONSTRAINT "user_gift_cards_user_purchased_voucher_id_fkey";

-- DropForeignKey
ALTER TABLE "voucher_gift_card_mappings" DROP CONSTRAINT "voucher_gift_card_mappings_gift_card_id_fkey";

-- DropForeignKey
ALTER TABLE "voucher_gift_card_mappings" DROP CONSTRAINT "voucher_gift_card_mappings_voucher_id_fkey";

-- AlterTable
ALTER TABLE "user_gift_cards" DROP COLUMN "user_purchased_voucher_id";

-- DropTable
DROP TABLE "voucher_gift_card_mappings";
