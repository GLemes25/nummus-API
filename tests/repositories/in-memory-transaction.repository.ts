import { randomUUID } from "crypto";
import { makeAppError } from "../../src/shared/errors/make-app-error.js";
import type { InMemoryWallet } from "./in-memory-wallet.repository.ts";

type TransactionType = "INCOME" | "EXPENSE" | "BALANCE_ADJUSTMENT";
type PaymentMethod = "CASH" | "PIX" | "BANK_TRANSFER" | "DEBIT_CARD" | "CREDIT_CARD";

export type InMemoryTransaction = {
  id: string;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  date: Date;
  description: string;
  walletId: string | null;
  creditCardId: string | null;
  invoiceId: string | null;
  categoryId: string;
  userId: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type CreateWithBalanceData = {
  storedAmount: number;
  type: TransactionType;
  paymentMethod: "CASH" | "PIX" | "BANK_TRANSFER" | "DEBIT_CARD";
  date: Date;
  description: string;
  walletId: string;
  categoryId: string;
  userId: string;
  newBalance: number;
};

export const makeInMemoryTransactionRepository = (wallets: InMemoryWallet[]) => {
  const items: InMemoryTransaction[] = [];

  return {
    items,

    findById: async (id: string) => {
      return items.find((t) => t.id === id && t.deletedAt === null) ?? null;
    },

    createWithBalanceUpdate: async (data: CreateWithBalanceData) => {
      const transaction: InMemoryTransaction = {
        id: randomUUID(),
        amount: data.storedAmount,
        type: data.type,
        paymentMethod: data.paymentMethod,
        status: "COMPLETED",
        date: data.date,
        description: data.description,
        walletId: data.walletId,
        creditCardId: null,
        invoiceId: null,
        categoryId: data.categoryId,
        userId: data.userId,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      items.push(transaction);

      const wallet = wallets.find((w) => w.id === data.walletId);
      if (wallet) wallet.balance = data.newBalance;

      return transaction;
    },

    softDeleteWithReversal: async (transactionId: string, userId: string) => {
      const transaction = items.find((t) => t.id === transactionId && t.deletedAt === null);
      if (!transaction || transaction.userId !== userId) {
        throw makeAppError({
          code: "TRANSACTION_NOT_FOUND",
          message: "Transação não encontrada",
          statusCode: 404,
        });
      }

      transaction.deletedAt = new Date();

      if (transaction.walletId && (transaction.type === "INCOME" || transaction.type === "EXPENSE")) {
        const wallet = wallets.find((w) => w.id === transaction.walletId);
        if (wallet) {
          const delta = transaction.type === "INCOME" ? -transaction.amount : transaction.amount;
          wallet.balance += delta;
        }
      }
    },

    findManyPaginated: async () => {
      return { data: [], totalCount: 0 };
    },

    createWithInvoiceUpdate: async () => {
      throw new Error("createWithInvoiceUpdate is not implemented in the in-memory repository");
    },
  };
};
