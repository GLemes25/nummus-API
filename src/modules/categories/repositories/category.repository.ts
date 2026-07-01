import { prisma } from "../../../shared/lib/prisma.js";

import type { CreateCategoryDto } from "../dtos/create-category.dto.js";
import type { UpdateCategoryDto } from "../dtos/update-category.dto.js";

type CreateCategoryInput = CreateCategoryDto & { userId: string };

export const categoryRepository = {
  findByNameAndParent: async (
    userId: string,
    name: string,
    parentId: string | undefined
  ) => {
    return prisma.category.findFirst({
      where: { userId, name, parentId: parentId ?? null, deletedAt: null },
    });
  },

  findById: async (id: string) => {
    return prisma.category.findFirst({ where: { id, deletedAt: null } });
  },

  findManyByUser: async (userId: string) => {
    return prisma.category.findMany({
      where: { userId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  },

  create: async (data: CreateCategoryInput) => {
    return prisma.category.create({
      data: {
        name: data.name,
        color: data.color,
        icon: data.icon,
        parentId: data.parentId ?? null,
        userId: data.userId,
      },
    });
  },

  update: async (id: string, data: UpdateCategoryDto) => {
    return prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
        ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
      },
    });
  },
};
