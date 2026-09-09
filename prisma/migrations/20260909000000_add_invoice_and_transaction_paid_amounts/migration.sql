-- AlterTable
ALTER TABLE "credit_card_invoices" ADD COLUMN     "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "paidAt" TIMESTAMP(3);
