import { prisma } from "../lib/prisma.js";

interface CreateCategoryInput {
  name: string;
  color: string | null;
  userId: string;
}

export const createCategory = async (data: CreateCategoryInput) => {
  return prisma.category.create({
    data: {
      name: data.name,
      color: data.color,
      userId: data.userId,
    },
  });
};

export const getUserCategories = async (userId: string) => {
  return prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
};
