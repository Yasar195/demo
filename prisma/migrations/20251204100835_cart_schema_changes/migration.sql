/*
  Warnings:

  - A unique constraint covering the columns `[userId,voucherId]` on the table `carts` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "cart_user_idx" ON "carts"("userId");

-- CreateIndex
CREATE INDEX "cart_voucher_idx" ON "carts"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "carts_userId_voucherId_key" ON "carts"("userId", "voucherId");

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
