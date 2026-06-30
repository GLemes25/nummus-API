import { makeAppError } from "../../../shared/errors/make-app-error.js";
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
      throw makeAppError({
        code: "CATEGORY_ALREADY_EXISTS",
        message: "Já existe uma categoria com este nome neste nível",
        statusCode: 409,
      });
    }

    return repository.create(data);
  };
};
