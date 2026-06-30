import type { Transaction } from "@prisma/client";

import type { TransactionResponseDto } from "../../dtos/create-transaction.dto.js";

export const presentTransaction = (transaction: Transaction): TransactionResponseDto => ({
  id: transaction.id,
  amount: Number(transaction.amount),
  type: transaction.type,
  paymentMethod: transaction.paymentMethod,
  status: transaction.status,
  date: transaction.date,
  description: transaction.description,
  walletId: transaction.walletId,
  categoryId: transaction.categoryId,
  userId: transaction.userId,
  createdAt: transaction.createdAt,
  updatedAt: transaction.updatedAt,
});
