/*
  Warnings:

  - Added the required column `location_id` to the `voucher_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "voucher_requests" ADD COLUMN     "location_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "voucher_requests" ADD CONSTRAINT "voucher_requests_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "store_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
