/*
  Warnings:

  - You are about to drop the column `store_id` on the `vouchers` table. All the data in the column will be lost.
  - Added the required column `location_id` to the `vouchers` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReviewCategory" AS ENUM ('CUSTOMER_EXPERIENCE', 'PRODUCT_QUALITY', 'VALUE_FOR_MONEY', 'AMBIANCE_CLEANLINESS');

-- DropForeignKey
ALTER TABLE "vouchers" DROP CONSTRAINT "vouchers_store_id_fkey";

-- DropIndex
DROP INDEX "voucher_store_idx";

-- AlterTable
ALTER TABLE "vouchers" DROP COLUMN "store_id",
ADD COLUMN     "location_id" TEXT NOT NULL,
ADD COLUMN     "storeId" TEXT;

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "category" "ReviewCategory" NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reviews_location_id_idx" ON "reviews"("location_id");

-- CreateIndex
CREATE INDEX "reviews_user_id_idx" ON "reviews"("user_id");

-- CreateIndex
CREATE INDEX "reviews_category_idx" ON "reviews"("category");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_user_id_location_id_category_key" ON "reviews"("user_id", "location_id", "category");

-- CreateIndex
CREATE INDEX "voucher_location_idx" ON "vouchers"("location_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "store_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "store_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
