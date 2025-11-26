/*
  Warnings:

  - A unique constraint covering the columns `[owner_id]` on the table `stores` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[request_id]` on the table `stores` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `owner_id` to the `stores` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StoreRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "owner_id" TEXT NOT NULL,
ADD COLUMN     "request_id" TEXT;

-- CreateTable
CREATE TABLE "store_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "store_name" TEXT NOT NULL,
    "store_description" TEXT,
    "store_logo" TEXT,
    "store_website" TEXT,
    "store_email" TEXT,
    "store_phone" TEXT,
    "initial_location_data" JSONB,
    "business_documents" JSONB,
    "additional_notes" TEXT,
    "status" "StoreRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "admin_comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "store_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_id_idx" ON "store_requests"("user_id");

-- CreateIndex
CREATE INDEX "status_idx" ON "store_requests"("status");

-- CreateIndex
CREATE INDEX "reviewed_by_id_idx" ON "store_requests"("reviewed_by_id");

-- CreateIndex
CREATE INDEX "user_status_idx" ON "store_requests"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stores_owner_id_key" ON "stores"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "stores_request_id_key" ON "stores"("request_id");

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "store_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_requests" ADD CONSTRAINT "store_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_requests" ADD CONSTRAINT "store_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
