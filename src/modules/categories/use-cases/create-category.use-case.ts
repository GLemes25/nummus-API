import type { categoryRepository } from "../repositories/category.repository.js";
import type { CreateCategoryDto } from "../dtos/create-category.dto.js";

type CategoryRepository = typeof categoryRepository;
type CreateCategoryInput = CreateCategoryDto & { userId: string };

export const makeCreateCategoryUseCase = (repository: CategoryRepository) => {
  return async (data: CreateCategoryInput) => {
    const existing = await repository.findByNameAndParent(
      data.userId,
      data.name,
      data.parentId
    );

    if (existing) {
      throw new Error("A category with this name already exists at this level");
    }

    return repository.create(data);
  };
};
