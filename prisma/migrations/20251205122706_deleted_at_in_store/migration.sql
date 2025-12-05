/*
  Warnings:

  - You are about to drop the column `deleted_at` on the `stores` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "stores" DROP COLUMN "deleted_at",
ADD COLUMN     "deletedAt" TIMESTAMP(3);
