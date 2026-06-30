import type { Prisma, Transaction } from "@prisma/client";

import type { TransactionResponseDto } from "../../dtos/create-transaction.dto.js";
import type { TransactionListItemDto } from "../../dtos/get-transactions.dto.js";

type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: {
    category: { select: { id: true; name: true; color: true; icon: true } };
    wallet: { select: { id: true; name: true; currency: true } };
  };
}>;

export const presentTransaction = (transaction: Transaction): TransactionResponseDto => ({
  id: transaction.id,
  amount: Number(transaction.amount),
  type: transaction.type,
  paymentMethod: transaction.paymentMethod,
  status: transaction.status,
  date: transaction.date,
  description: transaction.description,
  walletId: transaction.walletId,
  creditCardId: transaction.creditCardId,
  categoryId: transaction.categoryId,
  userId: transaction.userId,
  createdAt: transaction.createdAt,
  updatedAt: transaction.updatedAt,
});

export const presentTransactionListItem = (transaction: TransactionWithRelations): TransactionListItemDto => ({
  id: transaction.id,
  amount: Number(transaction.amount),
  type: transaction.type,
  paymentMethod: transaction.paymentMethod,
  status: transaction.status,
  date: transaction.date,
  description: transaction.description,
  walletId: transaction.walletId,
  creditCardId: transaction.creditCardId,
  categoryId: transaction.categoryId,
  userId: transaction.userId,
  createdAt: transaction.createdAt,
  updatedAt: transaction.updatedAt,
  category: transaction.category,
  wallet: transaction.wallet,
});
