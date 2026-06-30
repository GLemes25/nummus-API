import { prisma } from "../../../shared/lib/prisma.js";

import type { CreateCreditCardDto } from "../dtos/create-credit-card.dto.js";

type CreateCreditCardInput = CreateCreditCardDto & { userId: string };

export const creditCardRepository = {
  findByNameAndUser: async (userId: string, name: string) => {
    return prisma.creditCard.findFirst({ where: { userId, name, deletedAt: null } });
  },

  findById: async (id: string) => {
    return prisma.creditCard.findFirst({ where: { id, deletedAt: null } });
  },

  create: async (data: CreateCreditCardInput) => {
    return prisma.creditCard.create({
      data: {
        name: data.name,
        limit: data.limit,
        closingDay: data.closingDay,
        dueDay: data.dueDay,
        userId: data.userId,
      },
    });
  },
};
