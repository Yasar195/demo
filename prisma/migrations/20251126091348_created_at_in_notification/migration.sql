-- AlterTable
ALTER TABLE "notification_recipients" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
