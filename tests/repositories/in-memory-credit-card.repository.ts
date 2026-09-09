import { randomUUID } from "crypto";
import type { InMemoryWallet } from "./in-memory-wallet.repository.js";

type InMemoryCreditCard = {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  walletId: string | null;
  userId: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type InMemoryCreditCardInvoice = {
  id: string;
  creditCardId: string;
  totalAmount: number;
  paidAmount: number;
  paid: boolean;
  deletedAt: Date | null;
  periodStartDate?: Date;
  periodEndDate?: Date;
  dueDate?: Date;
};

type InMemoryInvoiceTransaction = {
  id: string;
  invoiceId: string;
  amount: number;
  paidAt: Date | null;
};

type InMemoryPaymentTransaction = {
  id: string;
  walletId: string;
  amount: number;
  categoryId: string;
  userId: string;
  invoiceId: string;
  deletedAt: Date | null;
};

type UpdateCreditCardData = {
  name?: string;
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
  walletId?: string;
};

export const makeInMemoryCreditCardRepository = (wallets?: InMemoryWallet[]) => {
  const items: InMemoryCreditCard[] = [];
  const invoices: InMemoryCreditCardInvoice[] = [];
  const invoiceTransactions: InMemoryInvoiceTransaction[] = [];
  const paymentTransactions: InMemoryPaymentTransaction[] = [];

  return {
    items,
    invoices,
    invoiceTransactions,
    paymentTransactions,

    findByNameAndUser: async (userId: string, name: string) => {
      return items.find((c) => c.userId === userId && c.name === name && c.deletedAt === null) ?? null;
    },

    findById: async (id: string) => {
      return items.find((c) => c.id === id && c.deletedAt === null) ?? null;
    },

    findAllByUserId: async (userId: string) => {
      return items
        .filter((c) => c.userId === userId && c.deletedAt === null)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((c) => ({
          ...c,
          invoices: invoices.filter(
            (i) => i.creditCardId === c.id && !i.paid && i.deletedAt === null,
          ),
        }));
    },

    create: async (data: {
      name: string;
      creditLimit: number;
      closingDay: number;
      dueDay: number;
      walletId?: string;
      userId: string;
    }) => {
      const card: InMemoryCreditCard = {
        id: randomUUID(),
        name: data.name,
        limit: data.creditLimit,
        closingDay: data.closingDay,
        dueDay: data.dueDay,
        walletId: data.walletId ?? null,
        userId: data.userId,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      items.push(card);
      return card;
    },

    update: async (id: string, data: UpdateCreditCardData) => {
      const card = items.find((c) => c.id === id && c.deletedAt === null);
      if (!card) return null;
      if (data.name !== undefined) card.name = data.name;
      if (data.creditLimit !== undefined) card.limit = data.creditLimit;
      if (data.closingDay !== undefined) card.closingDay = data.closingDay;
      if (data.dueDay !== undefined) card.dueDay = data.dueDay;
      if (data.walletId !== undefined) card.walletId = data.walletId;
      card.updatedAt = new Date();
      return card;
    },

    softDelete: async (id: string) => {
      const card = items.find((c) => c.id === id);
      if (card) card.deletedAt = new Date();
    },

    findInvoiceById: async (invoiceId: string) => {
      return invoices.find((i) => i.id === invoiceId && i.deletedAt === null) ?? null;
    },

    findInvoiceTransactionsByIds: async (invoiceId: string, transactionIds: string[]) => {
      return invoiceTransactions.filter(
        (t) => t.invoiceId === invoiceId && t.paidAt === null && transactionIds.includes(t.id),
      );
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

      const invoice = invoices.find((i) => i.id === invoiceId);
      if (invoice) {
        invoice.paidAmount += amount;
        if (invoice.paidAmount >= invoice.totalAmount) {
          invoice.paid = true;
        }
      }

      if (transactionIds && transactionIds.length > 0) {
        invoiceTransactions
          .filter((t) => t.invoiceId === invoiceId && transactionIds.includes(t.id))
          .forEach((t) => {
            t.paidAt = new Date();
          });
      }

      if (wallets) {
        const wallet = wallets.find((w) => w.id === walletId);
        if (wallet) wallet.balance -= amount;
      }

      paymentTransactions.push({
        id: randomUUID(),
        walletId,
        amount,
        categoryId,
        userId,
        invoiceId,
        deletedAt: null,
      });
    },

    reopenInvoice: async (invoiceId: string) => {
      const invoice = invoices.find((i) => i.id === invoiceId);
      if (!invoice) return;

      const relatedPayments = paymentTransactions.filter(
        (p) => p.invoiceId === invoiceId && p.deletedAt === null,
      );

      for (const payment of relatedPayments) {
        if (wallets) {
          const wallet = wallets.find((w) => w.id === payment.walletId);
          if (wallet) wallet.balance += payment.amount;
        }
        payment.deletedAt = new Date();
      }

      invoiceTransactions
        .filter((t) => t.invoiceId === invoiceId && t.paidAt !== null)
        .forEach((t) => {
          t.paidAt = null;
        });

      invoice.paidAmount = 0;
      invoice.paid = false;
    },
  };
};
