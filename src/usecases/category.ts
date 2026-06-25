import { prisma } from "../lib/prisma.js";

type CreateCategoryInput = {
  name: string;
  color?: string;
  userId: string;
};

export const createCategory = async (data: CreateCategoryInput) => {
  return prisma.category.create({
    data: {
      name: data.name,
      color: data.color ?? "#6B7280",
      icon: "tag",
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
