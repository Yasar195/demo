/*
  Warnings:

  - Added the required column `updated_at` to the `subscription_history` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "subscription_history" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "subscription_payments" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user_gift_cards" ADD COLUMN     "deleted_at" TIMESTAMP(3);
