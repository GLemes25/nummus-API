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

type FindManyPaginatedInput = {
  userId: string;
  page: number;
  limit: number;
  startDate?: Date;
  endDate?: Date;
  walletId?: string;
  categoryId?: string;
  type?: "INCOME" | "EXPENSE" | "BALANCE_ADJUSTMENT";
};

export const transactionRepository = {
  findById: async (id: string) => {
    return prisma.transaction.findFirst({ where: { id, deletedAt: null } });
  },

  findManyPaginated: async (filters: FindManyPaginatedInput) => {
    const { userId, page, limit, startDate, endDate, walletId, categoryId, type } = filters;
    const skip = (page - 1) * limit;

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const where = {
      userId,
      deletedAt: null,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      ...(walletId ? { walletId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(type ? { type } : {}),
    };

    const [data, totalCount] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, color: true, icon: true } },
          wallet: { select: { id: true, name: true, currency: true } },
        },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return { data, totalCount };
  },

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

  softDeleteWithReversal: async (transactionId: string, userId: string) => {
    await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id: transactionId, deletedAt: null },
      });

      if (!transaction) throw new Error("Transaction not found");
      if (transaction.userId !== userId) throw new Error("Transaction not found");

      await tx.transaction.update({
        where: { id: transactionId },
        data: { deletedAt: new Date() },
      });

      if (transaction.walletId && (transaction.type === "INCOME" || transaction.type === "EXPENSE")) {
        const balanceDelta =
          transaction.type === "INCOME"
            ? -Number(transaction.amount)
            : Number(transaction.amount);

        await tx.wallet.update({
          where: { id: transaction.walletId },
          data: { balance: { increment: balanceDelta } },
        });
      }
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
