-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'BALANCE_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'PIX', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "InvestmentType" AS ENUM ('FIXED_INCOME', 'VARIABLE_INCOME', 'CRYPTO', 'REAL_ESTATE', 'MULTIMARKET');

-- CreateEnum
CREATE TYPE "InvestmentLogType" AS ENUM ('BUY', 'SELL', 'YIELD');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('OK', 'SYNCING', 'AUTH_EXPIRED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "open_finance_connections" (
    "id" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'OK',
    "lastSyncedAt" TIMESTAMP(3),
    "walletId" TEXT,
    "creditCardId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "open_finance_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "initialBalance" DECIMAL(12,2) NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ticker" TEXT,
    "type" "InvestmentType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "quantity" DECIMAL(12,6) NOT NULL,
    "averagePrice" DECIMAL(12,2) NOT NULL,
    "currentValue" DECIMAL(12,2) NOT NULL,
    "institution" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_logs" (
    "id" TEXT NOT NULL,
    "type" "InvestmentLogType" NOT NULL,
    "quantity" DECIMAL(12,6) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "investmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "parentId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_tags" (
    "transactionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "transaction_tags_pkey" PRIMARY KEY ("transactionId","tagId")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "walletId" TEXT,
    "creditCardId" TEXT,
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "installmentPlanId" TEXT,
    "installmentNumber" INTEGER,
    "invoiceId" TEXT,
    "costCenterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "outTransactionId" TEXT NOT NULL,
    "inTransactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_transactions" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL,
    "nextExecutionDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "walletId" TEXT,
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "recurring_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_cards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "limit" DECIMAL(12,2) NOT NULL,
    "closingDay" INTEGER NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "credit_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_card_invoices" (
    "id" TEXT NOT NULL,
    "periodStartDate" TIMESTAMP(3) NOT NULL,
    "periodEndDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "creditCardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "credit_card_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installment_plans" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "totalInstallments" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "installment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "limitAmount" DECIMAL(12,2) NOT NULL,
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DECIMAL(12,2) NOT NULL,
    "currentAmount" DECIMAL(12,2) NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "walletId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "net_worth_snapshots" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalAssets" DECIMAL(12,2) NOT NULL,
    "totalLiabilities" DECIMAL(12,2) NOT NULL,
    "netWorth" DECIMAL(12,2) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "net_worth_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_providerId_accountId_key" ON "accounts"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "open_finance_connections_walletId_key" ON "open_finance_connections"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "open_finance_connections_creditCardId_key" ON "open_finance_connections"("creditCardId");

-- CreateIndex
CREATE INDEX "open_finance_connections_userId_idx" ON "open_finance_connections"("userId");

-- CreateIndex
CREATE INDEX "open_finance_connections_status_idx" ON "open_finance_connections"("status");

-- CreateIndex
CREATE INDEX "open_finance_connections_userId_deletedAt_idx" ON "open_finance_connections"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "wallets_userId_idx" ON "wallets"("userId");

-- CreateIndex
CREATE INDEX "wallets_userId_deletedAt_idx" ON "wallets"("userId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_name_key" ON "wallets"("userId", "name");

-- CreateIndex
CREATE INDEX "investments_userId_idx" ON "investments"("userId");

-- CreateIndex
CREATE INDEX "investments_userId_type_idx" ON "investments"("userId", "type");

-- CreateIndex
CREATE INDEX "investments_userId_deletedAt_idx" ON "investments"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "investment_logs_investmentId_idx" ON "investment_logs"("investmentId");

-- CreateIndex
CREATE INDEX "investment_logs_investmentId_date_idx" ON "investment_logs"("investmentId", "date");

-- CreateIndex
CREATE INDEX "categories_userId_idx" ON "categories"("userId");

-- CreateIndex
CREATE INDEX "categories_userId_parentId_idx" ON "categories"("userId", "parentId");

-- CreateIndex
CREATE INDEX "categories_userId_deletedAt_idx" ON "categories"("userId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "categories_userId_name_parentId_key" ON "categories"("userId", "name", "parentId");

-- CreateIndex
CREATE INDEX "cost_centers_userId_idx" ON "cost_centers"("userId");

-- CreateIndex
CREATE INDEX "cost_centers_userId_deletedAt_idx" ON "cost_centers"("userId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_userId_name_key" ON "cost_centers"("userId", "name");

-- CreateIndex
CREATE INDEX "tags_userId_idx" ON "tags"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_userId_name_key" ON "tags"("userId", "name");

-- CreateIndex
CREATE INDEX "transaction_tags_tagId_idx" ON "transaction_tags"("tagId");

-- CreateIndex
CREATE INDEX "transactions_userId_date_idx" ON "transactions"("userId", "date");

-- CreateIndex
CREATE INDEX "transactions_userId_type_idx" ON "transactions"("userId", "type");

-- CreateIndex
CREATE INDEX "transactions_userId_status_idx" ON "transactions"("userId", "status");

-- CreateIndex
CREATE INDEX "transactions_userId_deletedAt_idx" ON "transactions"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "transactions_walletId_idx" ON "transactions"("walletId");

-- CreateIndex
CREATE INDEX "transactions_creditCardId_idx" ON "transactions"("creditCardId");

-- CreateIndex
CREATE INDEX "transactions_categoryId_idx" ON "transactions"("categoryId");

-- CreateIndex
CREATE INDEX "transactions_invoiceId_idx" ON "transactions"("invoiceId");

-- CreateIndex
CREATE INDEX "transactions_installmentPlanId_idx" ON "transactions"("installmentPlanId");

-- CreateIndex
CREATE INDEX "transactions_date_idx" ON "transactions"("date");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_outTransactionId_key" ON "transfers"("outTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_inTransactionId_key" ON "transfers"("inTransactionId");

-- CreateIndex
CREATE INDEX "transfers_userId_idx" ON "transfers"("userId");

-- CreateIndex
CREATE INDEX "recurring_transactions_nextExecutionDate_idx" ON "recurring_transactions"("nextExecutionDate");

-- CreateIndex
CREATE INDEX "recurring_transactions_userId_active_idx" ON "recurring_transactions"("userId", "active");

-- CreateIndex
CREATE INDEX "recurring_transactions_userId_deletedAt_idx" ON "recurring_transactions"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "attachments_transactionId_idx" ON "attachments"("transactionId");

-- CreateIndex
CREATE INDEX "credit_cards_userId_idx" ON "credit_cards"("userId");

-- CreateIndex
CREATE INDEX "credit_cards_userId_deletedAt_idx" ON "credit_cards"("userId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "credit_cards_userId_name_key" ON "credit_cards"("userId", "name");

-- CreateIndex
CREATE INDEX "credit_card_invoices_creditCardId_idx" ON "credit_card_invoices"("creditCardId");

-- CreateIndex
CREATE INDEX "credit_card_invoices_creditCardId_paid_idx" ON "credit_card_invoices"("creditCardId", "paid");

-- CreateIndex
CREATE INDEX "credit_card_invoices_dueDate_idx" ON "credit_card_invoices"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "credit_card_invoices_creditCardId_periodStartDate_periodEnd_key" ON "credit_card_invoices"("creditCardId", "periodStartDate", "periodEndDate");

-- CreateIndex
CREATE INDEX "installment_plans_userId_idx" ON "installment_plans"("userId");

-- CreateIndex
CREATE INDEX "installment_plans_userId_deletedAt_idx" ON "installment_plans"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "budgets_userId_idx" ON "budgets"("userId");

-- CreateIndex
CREATE INDEX "budgets_userId_year_month_idx" ON "budgets"("userId", "year", "month");

-- CreateIndex
CREATE INDEX "budgets_userId_deletedAt_idx" ON "budgets"("userId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_userId_categoryId_month_year_key" ON "budgets"("userId", "categoryId", "month", "year");

-- CreateIndex
CREATE INDEX "goals_userId_idx" ON "goals"("userId");

-- CreateIndex
CREATE INDEX "goals_userId_deletedAt_idx" ON "goals"("userId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "net_worth_snapshots_userId_date_key" ON "net_worth_snapshots"("userId", "date");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_finance_connections" ADD CONSTRAINT "open_finance_connections_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_finance_connections" ADD CONSTRAINT "open_finance_connections_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "credit_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_finance_connections" ADD CONSTRAINT "open_finance_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_logs" ADD CONSTRAINT "investment_logs_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "credit_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_installmentPlanId_fkey" FOREIGN KEY ("installmentPlanId") REFERENCES "installment_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "credit_card_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_outTransactionId_fkey" FOREIGN KEY ("outTransactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_inTransactionId_fkey" FOREIGN KEY ("inTransactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_card_invoices" ADD CONSTRAINT "credit_card_invoices_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "credit_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "net_worth_snapshots" ADD CONSTRAINT "net_worth_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
