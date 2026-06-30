import type { Category } from "@prisma/client";

import type { CategoryResponseDto } from "../../dtos/create-category.dto.js";

export const presentCategory = (category: Category): CategoryResponseDto => ({
  id: category.id,
  name: category.name,
  color: category.color,
  icon: category.icon,
  parentId: category.parentId,
  userId: category.userId,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});
