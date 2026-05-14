import { prisma } from "../lib/prisma.js";

interface CreateWalletInput {
  name: string;
  initialBalance?: number;
  userId: string;
}

export const createWallet = async (data: CreateWalletInput) => {
  return prisma.wallet.create({
    data: {
      name: data.name,
      balance: data.initialBalance ?? 0,
      userId: data.userId,
    },
  });
};

export const getUserWallets = async (userId: string) => {
  return prisma.wallet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};
