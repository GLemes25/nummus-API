import { prisma } from "../lib/prisma.js";

// Defina a interface do input (DTO)
interface CreateTransactionInput {
  userId: string;
  walletId: string;
  categoryId: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  date: Date;
  description: string;
}

// Exporte uma função pura/assíncrona
export const createTransaction = async (data: CreateTransactionInput) => {
  const transaction = await prisma.transaction.create({
    data: {
      userId: data.userId,
      walletId: data.walletId,
      categoryId: data.categoryId,
      amount: data.amount,
      type: data.type,
      date: data.date,
      description: data.description,
    },
  });

  return transaction;
};
