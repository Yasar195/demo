-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "quantity_reserved" INTEGER,
ADD COLUMN     "reservation_expires_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "vouchers" ADD COLUMN     "reserved_quantity" INTEGER NOT NULL DEFAULT 0;
