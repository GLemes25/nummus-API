import { PaymentMethod, TransactionStatus } from "@prisma/client";

import { prisma } from "../../../shared/lib/prisma.js";

type CreateTransactionData = {
  storedAmount: number;
  type: "INCOME" | "EXPENSE" | "BALANCE_ADJUSTMENT";
  paymentMethod: Exclude<PaymentMethod, "CREDIT">;
  status: TransactionStatus;
  date: Date;
  description: string;
  walletId: string;
  categoryId: string | null;
  userId: string;
  newBalance: number;
};

type CreateWithInvoiceData = {
  amount: number;
  type: "INCOME" | "EXPENSE" | "BALANCE_ADJUSTMENT";
  status: TransactionStatus;
  date: Date;
  description: string;
  creditCardId: string;
  categoryId: string | null;
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
};

type UpdateTransactionData = {
  amount: number;
  type: "INCOME" | "EXPENSE" | "BALANCE_ADJUSTMENT";
  paymentMethod: PaymentMethod;
  date: Date;
  description: string;
  walletId: string | null;
  categoryId: string | null;
};

type WalletBalanceUpdate = {
  walletId: string;
  newBalance: number;
};

type FindManyPaginatedInput = {
  userId: string;
  page: number;
  limit: number;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  walletId?: string;
  categoryId?: string;
  creditCardId?: string;
  type?: "INCOME" | "EXPENSE" | "BALANCE_ADJUSTMENT";
};

type CreateWalletInstallmentItem = {
  amount: number;
  type: "INCOME" | "EXPENSE" | "BALANCE_ADJUSTMENT";
  paymentMethod: Exclude<PaymentMethod, "CREDIT">;
  status: TransactionStatus;
  date: Date;
  description: string;
  walletId: string;
  categoryId: string | null;
  userId: string;
  installmentId: string;
  installmentNumber: number;
};

type CreateCreditInstallmentItem = {
  amount: number;
  type: "INCOME" | "EXPENSE" | "BALANCE_ADJUSTMENT";
  status: TransactionStatus;
  date: Date;
  description: string;
  creditCardId: string;
  categoryId: string | null;
  userId: string;
  installmentId: string;
  installmentNumber: number;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
};

export const transactionRepository = {
  findById: async (id: string) => {
    return prisma.transaction.findFirst({ where: { id } });
  },

  findManyPaginated: async (filters: FindManyPaginatedInput) => {
    const { userId, page, limit, startDate, endDate, search, walletId, categoryId, creditCardId, type } =
      filters;
    const skip = (page - 1) * limit;

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const where = {
      userId,
      deletedAt: null,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      ...(search ? { description: { contains: search, mode: "insensitive" as const } } : {}),
      ...(walletId ? { walletId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(creditCardId ? { creditCardId } : {}),
      ...(type ? { type } : {}),
    };

    const [data, totalCount] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, color: true, icon: true } },
          wallet: { select: { id: true, name: true, currency: true } },
          invoice: { select: { id: true, periodStartDate: true, periodEndDate: true, dueDate: true } },
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
          status: data.status,
          date: data.date,
          description: data.description,
          walletId: data.walletId,
          categoryId: data.categoryId,
          userId: data.userId,
        },
      });

      if (data.status === "COMPLETED") {
        await tx.wallet.update({
          where: { id: data.walletId },
          data: { balance: data.newBalance },
        });
      }

      return transaction;
    });
  },

  updateWithBalanceUpdate: async (
    transactionId: string,
    data: UpdateTransactionData,
    walletUpdates: WalletBalanceUpdate[]
  ) => {
    return prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          amount: data.amount,
          type: data.type,
          paymentMethod: data.paymentMethod,
          date: data.date,
          description: data.description,
          walletId: data.walletId,
          categoryId: data.categoryId,
        },
      });

      for (const walletUpdate of walletUpdates) {
        await tx.wallet.update({
          where: { id: walletUpdate.walletId },
          data: { balance: walletUpdate.newBalance },
        });
      }

      return transaction;
    });
  },

  softDeleteWithReversal: async (transactionId: string) => {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.transaction.updateMany({
        where: { id: transactionId, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      // Guarda atômica: se nada foi atualizado, a transação já estava
      // deletada (execução concorrente) e o saldo não deve ser revertido de novo.
      if (count === 0) return;

      const transaction = await tx.transaction.findFirst({ where: { id: transactionId } });

      if (!transaction) return;

      if (
        transaction.walletId &&
        transaction.status === "COMPLETED" &&
        (transaction.type === "INCOME" || transaction.type === "EXPENSE")
      ) {
        const balanceDelta =
          transaction.type === "INCOME"
            ? -Number(transaction.amount)
            : Number(transaction.amount);

        await tx.wallet.update({
          where: { id: transaction.walletId },
          data: { balance: { increment: balanceDelta } },
        });
      }

      // Transação de pagamento de fatura (saída de carteira vinculada a uma invoice,
      // sem creditCardId — diferente de uma compra no cartão): reverte o abatimento
      // feito na fatura e libera de volta as transações do cartão que ela quitou.
      if (transaction.invoiceId && transaction.walletId && !transaction.creditCardId) {
        const invoice = await tx.creditCardInvoice.findFirst({ where: { id: transaction.invoiceId } });

        if (invoice) {
          const revertedPaidAmount = Math.max(0, Number(invoice.paidAmount) - Number(transaction.amount));

          await tx.creditCardInvoice.update({
            where: { id: invoice.id },
            data: {
              paidAmount: revertedPaidAmount,
              paid: revertedPaidAmount >= Number(invoice.totalAmount),
            },
          });
        }

        await tx.transaction.updateMany({
          where: { paidByTransactionId: transactionId },
          data: { paidAt: null, paidByTransactionId: null },
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
          paymentMethod: "CREDIT",
          status: data.status,
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

  createManyWalletInstallments: async (
    installments: CreateWalletInstallmentItem[],
    walletId: string,
    firstInstallmentNewBalance: number
  ) => {
    return prisma.$transaction(async (tx) => {
      if (installments[0]?.status === "COMPLETED") {
        await tx.wallet.update({
          where: { id: walletId },
          data: { balance: firstInstallmentNewBalance },
        });
      }

      const results = [];
      for (const item of installments) {
        const transaction = await tx.transaction.create({
          data: {
            amount: item.amount,
            type: item.type,
            paymentMethod: item.paymentMethod,
            status: item.status,
            date: item.date,
            description: item.description,
            walletId: item.walletId,
            categoryId: item.categoryId,
            userId: item.userId,
            installmentId: item.installmentId,
            installmentNumber: item.installmentNumber,
          },
        });
        results.push(transaction);
      }

      return results[0]!;
    });
  },

  createManyCreditInstallments: async (installments: CreateCreditInstallmentItem[]) => {
    return prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of installments) {
        let invoice = await tx.creditCardInvoice.findFirst({
          where: {
            creditCardId: item.creditCardId,
            periodStartDate: { lte: item.date },
            periodEndDate: { gte: item.date },
            deletedAt: null,
          },
        });

        if (!invoice) {
          invoice = await tx.creditCardInvoice.create({
            data: {
              creditCardId: item.creditCardId,
              periodStartDate: item.periodStart,
              periodEndDate: item.periodEnd,
              dueDate: item.dueDate,
              totalAmount: 0,
            },
          });
        }

        await tx.creditCardInvoice.update({
          where: { id: invoice.id },
          data: { totalAmount: { increment: item.amount } },
        });

        const transaction = await tx.transaction.create({
          data: {
            amount: item.amount,
            type: item.type,
            paymentMethod: "CREDIT",
            status: item.status,
            date: item.date,
            description: item.description,
            creditCardId: item.creditCardId,
            categoryId: item.categoryId,
            userId: item.userId,
            invoiceId: invoice.id,
            installmentId: item.installmentId,
            installmentNumber: item.installmentNumber,
          },
        });
        results.push(transaction);
      }

      return results[0]!;
    });
  },

  realize: async (transactionId: string) => {
    return prisma.transaction.update({
      where: { id: transactionId },
      data: { status: "COMPLETED" },
    });
  },

  realizeWithBalanceUpdate: async (transactionId: string, walletId: string, newBalance: number) => {
    return prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.update({
        where: { id: transactionId },
        data: { status: "COMPLETED" },
      });

      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: newBalance },
      });

      return transaction;
    });
  },
};
