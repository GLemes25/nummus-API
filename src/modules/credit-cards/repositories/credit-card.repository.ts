import { prisma } from "../../../shared/lib/prisma.js";

import type { CreateCreditCardDto } from "../dtos/create-credit-card.dto.js";
import type { UpdateCreditCardDto } from "../dtos/update-credit-card.dto.js";

type CreateCreditCardInput = CreateCreditCardDto & { userId: string };

export const creditCardRepository = {
  findByNameAndUser: async (userId: string, name: string) => {
    return prisma.creditCard.findFirst({ where: { userId, name, deletedAt: null } });
  },

  findById: async (id: string) => {
    return prisma.creditCard.findFirst({ where: { id, deletedAt: null } });
  },

  findAllByUserId: async (userId: string) => {
    return prisma.creditCard.findMany({
      where: { userId, deletedAt: null },
      include: {
        invoices: {
          where: { paid: false, deletedAt: null },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  create: async (data: CreateCreditCardInput) => {
    return prisma.creditCard.create({
      data: {
        name: data.name,
        limit: data.creditLimit,
        closingDay: data.closingDay,
        dueDay: data.dueDay,
        walletId: data.walletId ?? null,
        userId: data.userId,
      },
    });
  },

  update: async (id: string, data: UpdateCreditCardDto) => {
    return prisma.creditCard.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.creditLimit !== undefined ? { limit: data.creditLimit } : {}),
        ...(data.closingDay !== undefined ? { closingDay: data.closingDay } : {}),
        ...(data.dueDay !== undefined ? { dueDay: data.dueDay } : {}),
        ...(data.walletId !== undefined ? { walletId: data.walletId } : {}),
      },
    });
  },

  softDelete: async (id: string) => {
    await prisma.creditCard.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  findInvoiceById: async (invoiceId: string) => {
    return prisma.creditCardInvoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
    });
  },

  findInvoiceTransactionsByIds: async (invoiceId: string, transactionIds: string[]) => {
    return prisma.transaction.findMany({
      where: { id: { in: transactionIds }, invoiceId, paidAt: null, deletedAt: null },
    });
  },

  payInvoice: async (params: {
    invoiceId: string;
    walletId: string;
    amount: number;
    userId: string;
    categoryId: string;
    transactionIds?: string[];
  }) => {
    const { invoiceId, walletId, amount, userId, categoryId, transactionIds } = params;

    return prisma.$transaction(async (tx) => {
      const invoice = await tx.creditCardInvoice.update({
        where: { id: invoiceId },
        data: { paidAmount: { increment: amount } },
      });

      const isFullyPaid = Number(invoice.paidAmount) >= Number(invoice.totalAmount);

      if (isFullyPaid) {
        await tx.creditCardInvoice.update({
          where: { id: invoiceId },
          data: { paid: true },
        });
      }

      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { decrement: amount } },
      });

      const paymentTransaction = await tx.transaction.create({
        data: {
          amount,
          type: "EXPENSE",
          paymentMethod: "TRANSFER",
          status: "COMPLETED",
          date: new Date(),
          description: "Pagamento de fatura de cartão de crédito",
          walletId,
          categoryId,
          userId,
          invoiceId,
        },
      });

      if (transactionIds && transactionIds.length > 0) {
        await tx.transaction.updateMany({
          where: { id: { in: transactionIds }, invoiceId },
          data: { paidAt: new Date(), paidByTransactionId: paymentTransaction.id },
        });
      }
    });
  },

  reopenInvoice: async (invoiceId: string) => {
    return prisma.$transaction(async (tx) => {
      // Transações de pagamento da fatura: saídas de carteira vinculadas à invoice, sem creditCardId
      const paymentTransactions = await tx.transaction.findMany({
        where: { invoiceId, creditCardId: null, deletedAt: null },
      });

      for (const paymentTransaction of paymentTransactions) {
        if (paymentTransaction.walletId) {
          await tx.wallet.update({
            where: { id: paymentTransaction.walletId },
            data: { balance: { increment: Number(paymentTransaction.amount) } },
          });
        }

        await tx.transaction.update({
          where: { id: paymentTransaction.id },
          data: { deletedAt: new Date() },
        });
      }

      await tx.transaction.updateMany({
        where: { invoiceId, paidByTransactionId: { not: null } },
        data: { paidAt: null, paidByTransactionId: null },
      });

      await tx.creditCardInvoice.update({
        where: { id: invoiceId },
        data: { paid: false, paidAmount: 0 },
      });
    });
  },
};
