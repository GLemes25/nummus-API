import type { CreditCard } from "@prisma/client";

import type { CreditCardResponseDto } from "../../dtos/create-credit-card.dto.js";

export const presentCreditCard = (creditCard: CreditCard): CreditCardResponseDto => ({
  id: creditCard.id,
  name: creditCard.name,
  limit: Number(creditCard.limit),
  closingDay: creditCard.closingDay,
  dueDay: creditCard.dueDay,
  userId: creditCard.userId,
  createdAt: creditCard.createdAt,
  updatedAt: creditCard.updatedAt,
});
