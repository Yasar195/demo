-- CreateEnum
CREATE TYPE "VoucherRedemptionStatus" AS ENUM ('UNUSED', 'USED', 'EXPIRED', 'REFUNDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "user_purchased_vouchers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "instance_code" TEXT NOT NULL,
    "purchase_price" DOUBLE PRECISION NOT NULL,
    "purchase_face_value" DOUBLE PRECISION NOT NULL,
    "purchase_discount" DOUBLE PRECISION NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "VoucherRedemptionStatus" NOT NULL DEFAULT 'UNUSED',
    "redeemed_at" TIMESTAMP(3),
    "redeemed_with" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_purchased_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_purchased_vouchers_payment_id_key" ON "user_purchased_vouchers"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_purchased_vouchers_instance_code_key" ON "user_purchased_vouchers"("instance_code");

-- CreateIndex
CREATE INDEX "user_voucher_user_idx" ON "user_purchased_vouchers"("user_id");

-- CreateIndex
CREATE INDEX "user_voucher_voucher_idx" ON "user_purchased_vouchers"("voucher_id");

-- CreateIndex
CREATE INDEX "user_voucher_status_idx" ON "user_purchased_vouchers"("status");

-- CreateIndex
CREATE INDEX "user_voucher_expires_idx" ON "user_purchased_vouchers"("expires_at");

-- CreateIndex
CREATE INDEX "user_voucher_code_idx" ON "user_purchased_vouchers"("instance_code");

-- AddForeignKey
ALTER TABLE "user_purchased_vouchers" ADD CONSTRAINT "user_purchased_vouchers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_purchased_vouchers" ADD CONSTRAINT "user_purchased_vouchers_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_purchased_vouchers" ADD CONSTRAINT "user_purchased_vouchers_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
