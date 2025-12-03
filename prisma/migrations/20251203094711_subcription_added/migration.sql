/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `stores` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAYMENT_REQUIRED', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'EXPIRED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "SubscriptionAction" AS ENUM ('CREATED', 'ACTIVATED', 'UPGRADED', 'DOWNGRADED', 'RENEWED', 'CANCELLED', 'EXPIRED', 'SUSPENDED', 'REACTIVATED', 'TRIAL_STARTED', 'TRIAL_ENDED', 'PAYMENT_FAILED', 'PAYMENT_SUCCEEDED');

-- AlterTable
ALTER TABLE "stores" DROP COLUMN "deletedAt",
ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "yearly_price" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "billing_period" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "trial_days" INTEGER NOT NULL DEFAULT 14,
    "max_vouchers" INTEGER,
    "max_locations" INTEGER,
    "max_active_vouchers" INTEGER,
    "analytics_access" BOOLEAN NOT NULL DEFAULT false,
    "priority_support" BOOLEAN NOT NULL DEFAULT false,
    "custom_branding" BOOLEAN NOT NULL DEFAULT false,
    "api_access" BOOLEAN NOT NULL DEFAULT false,
    "bulk_voucher_upload" BOOLEAN NOT NULL DEFAULT false,
    "advanced_reporting" BOOLEAN NOT NULL DEFAULT false,
    "multi_location_support" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "features" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_subscriptions" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "billing_period" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "start_date" TIMESTAMP(3) NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "subscribed_price" DECIMAL(10,2) NOT NULL,
    "subscribed_currency" TEXT NOT NULL DEFAULT 'INR',
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "next_billing_date" TIMESTAMP(3),
    "grace_period_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "store_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "payment_method" TEXT,
    "transaction_id" TEXT,
    "payment_gateway_ref" TEXT,
    "invoice_number" TEXT,
    "invoice_url" TEXT,
    "refunded_amount" DECIMAL(10,2),
    "refunded_at" TIMESTAMP(3),
    "refund_reason" TEXT,
    "metadata" JSONB,
    "paid_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_history" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "action" "SubscriptionAction" NOT NULL,
    "from_plan_id" TEXT,
    "to_plan_id" TEXT,
    "from_status" "SubscriptionStatus",
    "to_status" "SubscriptionStatus",
    "triggered_by" TEXT,
    "trigger_reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "store_subscriptions_store_id_key" ON "store_subscriptions"("store_id");

-- CreateIndex
CREATE INDEX "sub_store_id_idx" ON "store_subscriptions"("store_id");

-- CreateIndex
CREATE INDEX "sub_plan_id_idx" ON "store_subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "sub_status_idx" ON "store_subscriptions"("status");

-- CreateIndex
CREATE INDEX "sub_next_billing_idx" ON "store_subscriptions"("next_billing_date");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_transaction_id_key" ON "subscription_payments"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_invoice_number_key" ON "subscription_payments"("invoice_number");

-- CreateIndex
CREATE INDEX "sub_pay_subscription_id_idx" ON "subscription_payments"("subscription_id");

-- CreateIndex
CREATE INDEX "sub_pay_status_idx" ON "subscription_payments"("status");

-- CreateIndex
CREATE INDEX "sub_pay_transaction_id_idx" ON "subscription_payments"("transaction_id");

-- CreateIndex
CREATE INDEX "sub_hist_subscription_id_idx" ON "subscription_history"("subscription_id");

-- CreateIndex
CREATE INDEX "sub_hist_action_idx" ON "subscription_history"("action");

-- AddForeignKey
ALTER TABLE "store_subscriptions" ADD CONSTRAINT "store_subscriptions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_subscriptions" ADD CONSTRAINT "store_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "store_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "store_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
