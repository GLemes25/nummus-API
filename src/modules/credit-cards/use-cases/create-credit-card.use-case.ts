import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { creditCardRepository } from "../repositories/credit-card.repository.js";
import type { CreateCreditCardDto } from "../dtos/create-credit-card.dto.js";

type CreditCardRepository = typeof creditCardRepository;
type CreateCreditCardInput = CreateCreditCardDto & { userId: string };

export const makeCreateCreditCardUseCase = (repository: CreditCardRepository) => {
  return async (data: CreateCreditCardInput) => {
    const existing = await repository.findByNameAndUser(data.userId, data.name);
    if (existing) {
      throw makeAppError({
        code: "CREDIT_CARD_ALREADY_EXISTS",
        message: "Já existe um cartão de crédito com este nome",
        statusCode: 409,
      });
    }
    return repository.create(data);
  };
};
