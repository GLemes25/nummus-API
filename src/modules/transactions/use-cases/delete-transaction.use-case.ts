import type { transactionRepository } from "../repositories/transaction.repository.js";
import { makeAppError } from "../../../shared/errors/make-app-error.js";

type TransactionRepository = typeof transactionRepository;

type DeleteTransactionInput = {
  transactionId: string;
  userId: string;
};

export const makeDeleteTransactionUseCase = (repository: TransactionRepository) => {
  return async (data: DeleteTransactionInput) => {
    const transaction = await repository.findById(data.transactionId);

    if (!transaction) {
      throw makeAppError({
        code: "TRANSACTION_NOT_FOUND",
        message: "Transação não encontrada",
        statusCode: 404,
      });
    }

    if (transaction.userId !== data.userId) {
      throw makeAppError({
        code: "TRANSACTION_ACCESS_DENIED",
        message: "Você não tem permissão para excluir esta transação",
        statusCode: 403,
      });
    }

    if (transaction.deletedAt !== null) {
      return;
    }

    await repository.softDeleteWithReversal(data.transactionId);
  };
};
