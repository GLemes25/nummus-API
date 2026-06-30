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

type CreateWithInvoiceData = {
  amount: number;
  type: "INCOME" | "EXPENSE" | "BALANCE_ADJUSTMENT";
  date: Date;
  description: string;
  creditCardId: string;
  categoryId: string;
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
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

  createWithInvoiceUpdate: async (data: CreateWithInvoiceData) => {
    return prisma.$transaction(async (tx) => {
      let invoice = await tx.creditCardInvoice.findFirst({
        where: {
          creditCardId: data.creditCardId,
          periodStartDate: { lte: data.date },
          periodEndDate: { gte: data.date },
          deletedAt: null,
        },
      });

      if (!invoice) {
        invoice = await tx.creditCardInvoice.create({
          data: {
            creditCardId: data.creditCardId,
            periodStartDate: data.periodStart,
            periodEndDate: data.periodEnd,
            dueDate: data.dueDate,
            totalAmount: 0,
          },
        });
      }

      await tx.creditCardInvoice.update({
        where: { id: invoice.id },
        data: { totalAmount: { increment: data.amount } },
      });

      const transaction = await tx.transaction.create({
        data: {
          amount: data.amount,
          type: data.type,
          paymentMethod: "CREDIT_CARD",
          status: "COMPLETED",
          date: data.date,
          description: data.description,
          creditCardId: data.creditCardId,
          categoryId: data.categoryId,
          userId: data.userId,
          invoiceId: invoice.id,
        },
      });

      return transaction;
    });
  },
};
