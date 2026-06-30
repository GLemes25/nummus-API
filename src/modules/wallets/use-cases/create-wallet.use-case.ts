import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { walletRepository } from "../repositories/wallet.repository.js";
import type { CreateWalletDto } from "../dtos/create-wallet.dto.js";

type WalletRepository = typeof walletRepository;

type CreateWalletInput = CreateWalletDto & { userId: string };

export const makeCreateWalletUseCase = (repository: WalletRepository) => {
  return async (data: CreateWalletInput) => {
    if (data.initialBalance < 0) {
      throw makeAppError({
        code: "INVALID_INITIAL_BALANCE",
        message: "O saldo inicial não pode ser negativo",
      });
    }

    const existing = await repository.findByNameAndUser(data.userId, data.name);
    if (existing) {
      throw makeAppError({
        code: "WALLET_ALREADY_EXISTS",
        message: "Já existe uma carteira com este nome",
        statusCode: 409,
      });
    }

    return repository.create(data);
  };
};
