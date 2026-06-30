import { prisma } from "../../../shared/lib/prisma.js";

import type { CreateWalletDto } from "../dtos/create-wallet.dto.js";

type CreateWalletInput = CreateWalletDto & { userId: string };

export const walletRepository = {
  create: async (data: CreateWalletInput) => {
    return prisma.wallet.create({
      data: {
        name: data.name,
        currency: data.currency,
        initialBalance: data.initialBalance,
        balance: data.initialBalance,
        userId: data.userId,
      },
    });
  },

  findByNameAndUser: async (userId: string, name: string) => {
    return prisma.wallet.findFirst({ where: { userId, name, deletedAt: null } });
  },

  findById: async (id: string) => {
    return prisma.wallet.findFirst({ where: { id, deletedAt: null } });
  },

  findManyByUser: async (userId: string, isArchived?: boolean) => {
    return prisma.wallet.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(isArchived !== undefined ? { isArchived } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
