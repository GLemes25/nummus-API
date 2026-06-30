import { prisma } from "../../../shared/lib/prisma.js";

type CreateTransferInput = {
  sourceWalletId: string;
  destinationWalletId: string;
  amount: number;
  date: Date;
  description?: string;
  categoryId: string;
  userId: string;
};

export const transferRepository = {
  create: async (data: CreateTransferInput) => {
    return prisma.$transaction(async (tx) => {
      const sourceWallet = await tx.wallet.findFirst({
        where: { id: data.sourceWalletId, userId: data.userId, deletedAt: null },
      });
      if (!sourceWallet) throw new Error("Source wallet not found");

      const destinationWallet = await tx.wallet.findFirst({
        where: { id: data.destinationWalletId, userId: data.userId, deletedAt: null },
      });
      if (!destinationWallet) throw new Error("Destination wallet not found");

      const outTransaction = await tx.transaction.create({
        data: {
          amount: data.amount,
          type: "EXPENSE",
          paymentMethod: "BANK_TRANSFER",
          status: "COMPLETED",
          date: data.date,
          description: data.description ?? "Transfer out",
          walletId: data.sourceWalletId,
          categoryId: data.categoryId,
          userId: data.userId,
        },
      });

      await tx.wallet.update({
        where: { id: data.sourceWalletId },
        data: { balance: { decrement: data.amount } },
      });

      const inTransaction = await tx.transaction.create({
        data: {
          amount: data.amount,
          type: "INCOME",
          paymentMethod: "BANK_TRANSFER",
          status: "COMPLETED",
          date: data.date,
          description: data.description ?? "Transfer in",
          walletId: data.destinationWalletId,
          categoryId: data.categoryId,
          userId: data.userId,
        },
      });

      await tx.wallet.update({
        where: { id: data.destinationWalletId },
        data: { balance: { increment: data.amount } },
      });

      return tx.transfer.create({
        data: {
          outTransactionId: outTransaction.id,
          inTransactionId: inTransaction.id,
          userId: data.userId,
          description: data.description ?? null,
        },
      });
    });
  },
};
