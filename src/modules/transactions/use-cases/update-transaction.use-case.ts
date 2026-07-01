import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { transactionRepository } from "../repositories/transaction.repository.js";
import type { UpdateTransactionDto } from "../dtos/update-transaction.dto.js";

type TransactionRepository = typeof transactionRepository;
type WalletWithBalance = { balance: { toNumber: () => number } };
type FindWallet = (id: string) => Promise<WalletWithBalance | null>;

type UpdateTransactionInput = {
  transactionId: string;
  userId: string;
  data: UpdateTransactionDto;
};

export const makeUpdateTransactionUseCase = (
  repository: TransactionRepository,
  findWallet: FindWallet
) => {
  return async ({ transactionId, userId, data }: UpdateTransactionInput) => {
    const transaction = await repository.findById(transactionId);

    if (!transaction || transaction.deletedAt !== null) {
      throw makeAppError({
        code: "TRANSACTION_NOT_FOUND",
        message: "Transação não encontrada",
        statusCode: 404,
      });
    }

    if (transaction.userId !== userId) {
      throw makeAppError({
        code: "TRANSACTION_ACCESS_DENIED",
        message: "Você não tem permissão para editar esta transação",
        statusCode: 403,
      });
    }

    const resultingAmount = data.amount ?? Number(transaction.amount);
    const resultingType = data.type ?? transaction.type;
    const resultingWalletId = data.walletId !== undefined ? data.walletId : transaction.walletId;

    const walletDeltas = new Map<string, number>();

    const addDelta = (walletId: string | null, delta: number) => {
      if (!walletId || delta === 0) return;
      walletDeltas.set(walletId, (walletDeltas.get(walletId) ?? 0) + delta);
    };

    // Estorno: desfaz o impacto que a transação original causou na carteira antiga
    if (transaction.type === "INCOME" || transaction.type === "EXPENSE") {
      const reversalDelta =
        transaction.type === "INCOME" ? -Number(transaction.amount) : Number(transaction.amount);
      addDelta(transaction.walletId, reversalDelta);
    }

    // Aplicação: soma o impacto da transação já mesclada com os novos dados
    if (resultingType === "INCOME" || resultingType === "EXPENSE") {
      const applyDelta = resultingType === "INCOME" ? resultingAmount : -resultingAmount;
      addDelta(resultingWalletId, applyDelta);
    }

    const walletUpdates: { walletId: string; newBalance: number }[] = [];

    for (const [walletId, delta] of walletDeltas) {
      if (delta === 0) continue;

      const wallet = await findWallet(walletId);
      if (!wallet) {
        throw makeAppError({
          code: "WALLET_NOT_FOUND",
          message: "Carteira não encontrada",
          statusCode: 404,
        });
      }

      walletUpdates.push({ walletId, newBalance: wallet.balance.toNumber() + delta });
    }

    return repository.updateWithBalanceUpdate(
      transactionId,
      {
        amount: resultingAmount,
        type: resultingType,
        paymentMethod: data.paymentMethod ?? transaction.paymentMethod,
        date: data.date ?? transaction.date,
        description: data.description ?? transaction.description,
        walletId: resultingWalletId,
        categoryId: data.categoryId ?? transaction.categoryId,
      },
      walletUpdates
    );
  };
};
