-- AlterTable
ALTER TABLE "notification_recipients" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "deletedAt" TIMESTAMP(3);
