import { prisma } from "../../../shared/lib/prisma.js";

import type { CreateCostCenterDto } from "../dtos/create-cost-center.dto.js";

type CreateCostCenterInput = CreateCostCenterDto & { userId: string };

export const costCenterRepository = {
  findByNameAndUser: async (userId: string, name: string) => {
    return prisma.costCenter.findFirst({
      where: { userId, name, deletedAt: null },
    });
  },

  create: async (data: CreateCostCenterInput) => {
    return prisma.costCenter.create({
      data: {
        name: data.name,
        userId: data.userId,
      },
    });
  },
};
