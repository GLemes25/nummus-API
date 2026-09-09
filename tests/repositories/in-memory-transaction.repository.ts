import { randomUUID } from "crypto";
import type { InMemoryWallet } from "./in-memory-wallet.repository.ts";

type TransactionType = "INCOME" | "EXPENSE" | "BALANCE_ADJUSTMENT";
type PaymentMethod = "CASH" | "PIX" | "TRANSFER" | "DEBIT" | "CREDIT";

export type InMemoryTransaction = {
  id: string;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  status?: "PENDING" | "COMPLETED" | "CANCELLED";
  date: Date;
  description: string;
  walletId: string | null;
  creditCardId: string | null;
  invoiceId: string | null;
  categoryId: string | null;
  userId: string;
  installmentId: string | null;
  installmentNumber: number | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type CreateWithBalanceData = {
  storedAmount: number;
  type: TransactionType;
  paymentMethod: Exclude<PaymentMethod, "CREDIT">;
  status?: "PENDING" | "COMPLETED" | "CANCELLED";
  date: Date;
  description: string;
  walletId: string;
  categoryId: string;
  userId: string;
  newBalance: number;
};

type UpdateTransactionData = {
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  date: Date;
  description: string;
  walletId: string | null;
  categoryId: string;
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
  type: TransactionType;
  paymentMethod: Exclude<PaymentMethod, "CREDIT">;
  status?: "PENDING" | "COMPLETED" | "CANCELLED";
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
  type: TransactionType;
  status?: "PENDING" | "COMPLETED" | "CANCELLED";
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

export type InMemoryCreditCardInvoice = {
  id: string;
  creditCardId: string;
  periodStartDate: Date;
  periodEndDate: Date;
  dueDate: Date;
  totalAmount: number;
  paid: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type CreateWithInvoiceData = {
  amount: number;
  type: TransactionType;
  status?: "PENDING" | "COMPLETED" | "CANCELLED";
  date: Date;
  description: string;
  creditCardId: string;
  categoryId: string | null;
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
};

export const makeInMemoryTransactionRepository = (
  wallets: InMemoryWallet[],
  invoices: InMemoryCreditCardInvoice[] = []
) => {
  const items: InMemoryTransaction[] = [];

  return {
    items,
    invoices,

    findById: async (id: string) => {
      return items.find((t) => t.id === id) ?? null;
    },

    createWithBalanceUpdate: async (data: CreateWithBalanceData) => {
      const transaction: InMemoryTransaction = {
        id: randomUUID(),
        amount: data.storedAmount,
        type: data.type,
        paymentMethod: data.paymentMethod,
        status: data.status ?? "COMPLETED",
        date: data.date,
        description: data.description,
        walletId: data.walletId,
        creditCardId: null,
        invoiceId: null,
        categoryId: data.categoryId,
        userId: data.userId,
        installmentId: null,
        installmentNumber: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      items.push(transaction);

      if ((data.status ?? "COMPLETED") === "COMPLETED") {
        const wallet = wallets.find((w) => w.id === data.walletId);
        if (wallet) wallet.balance = data.newBalance;
      }

      return transaction;
    },

    updateWithBalanceUpdate: async (
      transactionId: string,
      data: UpdateTransactionData,
      walletUpdates: WalletBalanceUpdate[]
    ) => {
      const transaction = items.find((t) => t.id === transactionId);
      if (!transaction) return null;

      Object.assign(transaction, data, { updatedAt: new Date() });

      for (const walletUpdate of walletUpdates) {
        const wallet = wallets.find((w) => w.id === walletUpdate.walletId);
        if (wallet) wallet.balance = walletUpdate.newBalance;
      }

      return transaction;
    },

    softDeleteWithReversal: async (transactionId: string) => {
      const transaction = items.find((t) => t.id === transactionId);

      // Guarda atômica: se já não existir ou já estiver deletada, não reverte o saldo de novo.
      if (!transaction || transaction.deletedAt !== null) return;

      transaction.deletedAt = new Date();

      if (
        transaction.walletId &&
        transaction.status === "COMPLETED" &&
        (transaction.type === "INCOME" || transaction.type === "EXPENSE")
      ) {
        const wallet = wallets.find((w) => w.id === transaction.walletId);
        if (wallet) {
          const delta = transaction.type === "INCOME" ? -transaction.amount : transaction.amount;
          wallet.balance += delta;
        }
      }
    },

    findManyPaginated: async (filters: FindManyPaginatedInput) => {
      const { userId, page, limit, startDate, endDate, search, walletId, categoryId, creditCardId, type } =
        filters;
      const skip = (page - 1) * limit;

      let filtered = items.filter((t) => {
        if (t.userId !== userId) return false;
        if (t.deletedAt !== null) return false;
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
        if (walletId && t.walletId !== walletId) return false;
        if (categoryId && t.categoryId !== categoryId) return false;
        if (creditCardId && t.creditCardId !== creditCardId) return false;
        if (type && t.type !== type) return false;
        return true;
      });

      filtered.sort((a, b) => b.date.getTime() - a.date.getTime());

      const totalCount = filtered.length;
      const data = filtered.slice(skip, skip + limit).map((t) => ({
        ...t,
        category: null,
        wallet: null,
        invoice: invoices.find((i) => i.id === t.invoiceId) ?? null,
      }));

      return { data, totalCount };
    },

    createWithInvoiceUpdate: async (data: CreateWithInvoiceData) => {
      let invoice = invoices.find(
        (i) =>
          i.creditCardId === data.creditCardId &&
          i.deletedAt === null &&
          i.periodStartDate <= data.date &&
          i.periodEndDate >= data.date
      );

      if (!invoice) {
        invoice = {
          id: randomUUID(),
          creditCardId: data.creditCardId,
          periodStartDate: data.periodStart,
          periodEndDate: data.periodEnd,
          dueDate: data.dueDate,
          totalAmount: 0,
          paid: false,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        invoices.push(invoice);
      }

      invoice.totalAmount += data.amount;
      invoice.updatedAt = new Date();

      const transaction: InMemoryTransaction = {
        id: randomUUID(),
        amount: data.amount,
        type: data.type,
        paymentMethod: "CREDIT",
        status: data.status ?? "COMPLETED",
        date: data.date,
        description: data.description,
        walletId: null,
        creditCardId: data.creditCardId,
        invoiceId: invoice.id,
        categoryId: data.categoryId,
        userId: data.userId,
        installmentId: null,
        installmentNumber: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      items.push(transaction);

      return transaction;
    },

    createManyWalletInstallments: async (
      installmentItems: CreateWalletInstallmentItem[],
      walletId: string,
      firstInstallmentNewBalance: number
    ) => {
      const created: InMemoryTransaction[] = [];

      for (const item of installmentItems) {
        const transaction: InMemoryTransaction = {
          id: randomUUID(),
          amount: item.amount,
          type: item.type,
          paymentMethod: item.paymentMethod,
          status: item.status ?? "COMPLETED",
          date: item.date,
          description: item.description,
          walletId: item.walletId,
          creditCardId: null,
          invoiceId: null,
          categoryId: item.categoryId,
          userId: item.userId,
          installmentId: item.installmentId,
          installmentNumber: item.installmentNumber,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        items.push(transaction);
        created.push(transaction);
      }

      if ((installmentItems[0]?.status ?? "COMPLETED") === "COMPLETED") {
        const wallet = wallets.find((w) => w.id === walletId);
        if (wallet) wallet.balance = firstInstallmentNewBalance;
      }

      return created[0]!;
    },

    createManyCreditInstallments: async (installmentItems: CreateCreditInstallmentItem[]) => {
      const created: InMemoryTransaction[] = [];

      for (const item of installmentItems) {
        let invoice = invoices.find(
          (i) =>
            i.creditCardId === item.creditCardId &&
            i.deletedAt === null &&
            i.periodStartDate <= item.date &&
            i.periodEndDate >= item.date
        );

        if (!invoice) {
          invoice = {
            id: randomUUID(),
            creditCardId: item.creditCardId,
            periodStartDate: item.periodStart,
            periodEndDate: item.periodEnd,
            dueDate: item.dueDate,
            totalAmount: 0,
            paid: false,
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          invoices.push(invoice);
        }

        invoice.totalAmount += item.amount;
        invoice.updatedAt = new Date();

        const transaction: InMemoryTransaction = {
          id: randomUUID(),
          amount: item.amount,
          type: item.type,
          paymentMethod: "CREDIT",
          status: item.status ?? "COMPLETED",
          date: item.date,
          description: item.description,
          walletId: null,
          creditCardId: item.creditCardId,
          invoiceId: invoice.id,
          categoryId: item.categoryId,
          userId: item.userId,
          installmentId: item.installmentId,
          installmentNumber: item.installmentNumber,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        items.push(transaction);
        created.push(transaction);
      }

      return created[0]!;
    },

    realize: async (transactionId: string) => {
      const transaction = items.find((t) => t.id === transactionId);
      if (!transaction) return null;

      transaction.status = "COMPLETED";
      transaction.updatedAt = new Date();

      return transaction;
    },

    realizeWithBalanceUpdate: async (transactionId: string, walletId: string, newBalance: number) => {
      const transaction = items.find((t) => t.id === transactionId);
      if (!transaction) return null;

      transaction.status = "COMPLETED";
      transaction.updatedAt = new Date();

      const wallet = wallets.find((w) => w.id === walletId);
      if (wallet) wallet.balance = newBalance;

      return transaction;
    },
  };
};
