import { prisma } from "../lib/prisma.js";

import type { PaymentMethod, TransactionType } from "@prisma/client";

type CreateTransactionInput = {
  userId: string;
  walletId: string;
  categoryId: string;
  amount: number;
  type: TransactionType;
  paymentMethod?: PaymentMethod;
  date: Date;
  description: string;
};

export const createTransaction = async (data: CreateTransactionInput) => {
  return prisma.transaction.create({
    data: {
      userId: data.userId,
      walletId: data.walletId,
      categoryId: data.categoryId,
      amount: data.amount,
      type: data.type,
      paymentMethod: data.paymentMethod ?? "CASH",
      date: data.date,
      description: data.description,
    },
  });
};
