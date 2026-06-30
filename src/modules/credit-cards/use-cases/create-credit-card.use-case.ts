import type { creditCardRepository } from "../repositories/credit-card.repository.js";
import type { CreateCreditCardDto } from "../dtos/create-credit-card.dto.js";

type CreditCardRepository = typeof creditCardRepository;
type CreateCreditCardInput = CreateCreditCardDto & { userId: string };

export const makeCreateCreditCardUseCase = (repository: CreditCardRepository) => {
  return async (data: CreateCreditCardInput) => {
    const existing = await repository.findByNameAndUser(data.userId, data.name);
    if (existing) throw new Error("A credit card with this name already exists");
    return repository.create(data);
  };
};
