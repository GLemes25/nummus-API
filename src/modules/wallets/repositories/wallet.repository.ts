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

  findById: async (id: string) => {
    return prisma.wallet.findFirst({ where: { id, deletedAt: null } });
  },

  findManyByUser: async (userId: string) => {
    return prisma.wallet.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  },
};
