import type { transactionRepository } from "../repositories/transaction.repository.js";

type TransactionRepository = typeof transactionRepository;

type DeleteTransactionInput = {
  transactionId: string;
  userId: string;
};

export const makeDeleteTransactionUseCase = (repository: TransactionRepository) => {
  return async (data: DeleteTransactionInput) => {
    await repository.softDeleteWithReversal(data.transactionId, data.userId);
  };
};
