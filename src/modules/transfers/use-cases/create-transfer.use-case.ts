import type { transferRepository } from "../repositories/transfer.repository.js";
import type { CreateTransferDto } from "../dtos/create-transfer.dto.js";

type TransferRepository = typeof transferRepository;

type CreateTransferInput = CreateTransferDto & { userId: string };

export const makeCreateTransferUseCase = (repository: TransferRepository) => {
  return async (data: CreateTransferInput) => {
    if (data.sourceWalletId === data.destinationWalletId) {
      throw new Error("Source and destination wallets cannot be the same");
    }

    return repository.create({
      sourceWalletId: data.sourceWalletId,
      destinationWalletId: data.destinationWalletId,
      amount: data.amount,
      date: data.date,
      categoryId: data.categoryId,
      userId: data.userId,
      ...(data.description !== undefined ? { description: data.description } : {}),
    });
  };
};
