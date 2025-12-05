/*
  Warnings:

  - You are about to drop the column `initial_location_data` on the `store_requests` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[request_id]` on the table `store_locations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[initial_location_request_id]` on the table `store_requests` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "LocationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "store_locations" ADD COLUMN     "request_id" TEXT;

-- AlterTable
ALTER TABLE "store_requests" DROP COLUMN "initial_location_data",
ADD COLUMN     "initial_location_request_id" TEXT;

-- CreateTable
CREATE TABLE "location_requests" (
    "id" TEXT NOT NULL,
    "store_id" TEXT,
    "user_id" TEXT NOT NULL,
    "branch_name" TEXT,
    "is_main_branch" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL,
    "postal_code" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "operating_hours" JSONB,
    "additional_notes" TEXT,
    "status" "LocationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "admin_comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "storeLocationId" TEXT,

    CONSTRAINT "location_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "location_requests_user_id_idx" ON "location_requests"("user_id");

-- CreateIndex
CREATE INDEX "location_requests_store_id_idx" ON "location_requests"("store_id");

-- CreateIndex
CREATE INDEX "location_requests_status_idx" ON "location_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "store_locations_request_id_key" ON "store_locations"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_requests_initial_location_request_id_key" ON "store_requests"("initial_location_request_id");

-- AddForeignKey
ALTER TABLE "location_requests" ADD CONSTRAINT "location_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_requests" ADD CONSTRAINT "location_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_requests" ADD CONSTRAINT "location_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_requests" ADD CONSTRAINT "location_requests_storeLocationId_fkey" FOREIGN KEY ("storeLocationId") REFERENCES "store_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_requests" ADD CONSTRAINT "store_requests_initial_location_request_id_fkey" FOREIGN KEY ("initial_location_request_id") REFERENCES "location_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_locations" ADD CONSTRAINT "store_locations_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "location_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
