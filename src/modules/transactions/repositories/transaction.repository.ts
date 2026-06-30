import { prisma } from "../../../shared/lib/prisma.js";

type CreateTransactionData = {
  storedAmount: number;
  type: "INCOME" | "EXPENSE" | "BALANCE_ADJUSTMENT";
  paymentMethod: "CASH" | "PIX" | "BANK_TRANSFER" | "DEBIT_CARD";
  date: Date;
  description: string;
  walletId: string;
  categoryId: string;
  userId: string;
  newBalance: number;
};

export const transactionRepository = {
  createWithBalanceUpdate: async (data: CreateTransactionData) => {
    return prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          amount: data.storedAmount,
          type: data.type,
          paymentMethod: data.paymentMethod,
          status: "COMPLETED",
          date: data.date,
          description: data.description,
          walletId: data.walletId,
          categoryId: data.categoryId,
          userId: data.userId,
        },
      });

      await tx.wallet.update({
        where: { id: data.walletId },
        data: { balance: data.newBalance },
      });

      return transaction;
    });
  },
};
