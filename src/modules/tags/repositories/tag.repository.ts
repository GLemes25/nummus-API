import { prisma } from "../../../shared/lib/prisma.js";

import type { CreateTagDto } from "../dtos/create-tag.dto.js";

type CreateTagInput = CreateTagDto & { userId: string };

export const tagRepository = {
  findByNameAndUser: async (userId: string, name: string) => {
    return prisma.tag.findFirst({
      where: { userId, name, deletedAt: null },
    });
  },

  create: async (data: CreateTagInput) => {
    return prisma.tag.create({
      data: {
        name: data.name,
        userId: data.userId,
      },
    });
  },
};
