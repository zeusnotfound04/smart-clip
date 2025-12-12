/*
  Warnings:

  - A unique constraint covering the columns `[stripe_customer_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripe_subscription_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT,
ADD COLUMN     "subscription_end_date" TIMESTAMP(3),
ADD COLUMN     "subscription_start_date" TIMESTAMP(3),
ADD COLUMN     "subscription_status" TEXT,
ADD COLUMN     "subscription_tier" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "total_credits_used" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trial_used" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "project_id" TEXT,
    "project_type" TEXT,
    "video_duration" DOUBLE PRECISION,
    "stripe_payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stripe_subscription_id" TEXT,
    "stripe_price_id" TEXT,
    "stripe_customer_id" TEXT,
    "credits_per_month" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "billing_period" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthly_price" DOUBLE PRECISION NOT NULL,
    "yearly_price" DOUBLE PRECISION,
    "credits" INTEGER NOT NULL,
    "features" JSONB,
    "stripe_price_id_monthly" TEXT,
    "stripe_price_id_yearly" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_transactions_user_id_idx" ON "credit_transactions"("user_id");

-- CreateIndex
CREATE INDEX "credit_transactions_type_idx" ON "credit_transactions"("type");

-- CreateIndex
CREATE INDEX "credit_transactions_created_at_idx" ON "credit_transactions"("created_at");

-- CreateIndex
CREATE INDEX "subscription_history_user_id_idx" ON "subscription_history"("user_id");

-- CreateIndex
CREATE INDEX "subscription_history_status_idx" ON "subscription_history"("status");

-- CreateIndex
CREATE INDEX "subscription_history_created_at_idx" ON "subscription_history"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_tier_key" ON "subscription_plans"("tier");

-- CreateIndex
CREATE INDEX "subscription_plans_tier_idx" ON "subscription_plans"("tier");

-- CreateIndex
CREATE INDEX "subscription_plans_is_active_idx" ON "subscription_plans"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_subscription_id_key" ON "users"("stripe_subscription_id");

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
