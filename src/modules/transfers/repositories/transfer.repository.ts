import { prisma } from "../../../shared/lib/prisma.js";
import { makeAppError } from "../../../shared/errors/make-app-error.js";

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
      if (!sourceWallet) {
        throw makeAppError({
          code: "SOURCE_WALLET_NOT_FOUND",
          message: "Carteira de origem não encontrada",
          statusCode: 404,
        });
      }

      const destinationWallet = await tx.wallet.findFirst({
        where: { id: data.destinationWalletId, userId: data.userId, deletedAt: null },
      });
      if (!destinationWallet) {
        throw makeAppError({
          code: "DESTINATION_WALLET_NOT_FOUND",
          message: "Carteira de destino não encontrada",
          statusCode: 404,
        });
      }

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
