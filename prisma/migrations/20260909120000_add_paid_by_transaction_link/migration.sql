-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "paidByTransactionId" TEXT;

-- CreateIndex
CREATE INDEX "transactions_paidByTransactionId_idx" ON "transactions"("paidByTransactionId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_paidByTransactionId_fkey" FOREIGN KEY ("paidByTransactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
