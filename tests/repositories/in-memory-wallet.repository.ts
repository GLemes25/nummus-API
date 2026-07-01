import { randomUUID } from "crypto";

export type InMemoryWallet = {
  id: string;
  name: string;
  currency: string;
  initialBalance: number;
  balance: number;
  isArchived: boolean;
  userId: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const makeInMemoryWalletRepository = () => {
  const items: InMemoryWallet[] = [];

  return {
    items,

    create: async (data: { name: string; currency: string; initialBalance: number; userId: string }) => {
      const wallet: InMemoryWallet = {
        id: randomUUID(),
        name: data.name,
        currency: data.currency,
        initialBalance: data.initialBalance,
        balance: data.initialBalance,
        isArchived: false,
        userId: data.userId,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      items.push(wallet);
      return wallet;
    },

    findByNameAndUser: async (userId: string, name: string) => {
      return items.find((w) => w.userId === userId && w.name === name && w.deletedAt === null) ?? null;
    },

    findById: async (id: string) => {
      const wallet = items.find((w) => w.id === id && w.deletedAt === null);
      if (!wallet) return null;
      return {
        ...wallet,
        balance: { toNumber: () => wallet.balance },
        initialBalance: { toNumber: () => wallet.initialBalance },
      };
    },

    findManyByUser: async (userId: string, isArchived?: boolean) => {
      return items
        .filter((w) => w.userId === userId && w.deletedAt === null)
        .filter((w) => isArchived === undefined || w.isArchived === isArchived);
    },

    update: async (id: string, data: Partial<Pick<InMemoryWallet, "name" | "currency" | "initialBalance">>) => {
      const wallet = items.find((w) => w.id === id);
      if (!wallet) return null;
      Object.assign(wallet, data, { updatedAt: new Date() });
      return wallet;
    },
  };
};
