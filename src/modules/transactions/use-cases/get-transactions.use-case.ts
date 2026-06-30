import type { transactionRepository } from "../repositories/transaction.repository.js";
import type { GetTransactionsDto } from "../dtos/get-transactions.dto.js";

type TransactionRepository = typeof transactionRepository;

type GetTransactionsInput = GetTransactionsDto & { userId: string };

export const makeGetTransactionsUseCase = (repository: TransactionRepository) => {
  return async (data: GetTransactionsInput) => {
    const { userId, page, limit, startDate, endDate, walletId, categoryId, type } = data;

    const { data: transactions, totalCount } = await repository.findManyPaginated({
      userId,
      page,
      limit,
      ...(startDate !== undefined ? { startDate } : {}),
      ...(endDate !== undefined ? { endDate } : {}),
      ...(walletId !== undefined ? { walletId } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(type !== undefined ? { type } : {}),
    });

    return {
      data: transactions,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  };
};
