import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { categoryRepository } from "../repositories/category.repository.js";
import type { UpdateCategoryDto } from "../dtos/update-category.dto.js";

type CategoryRepository = typeof categoryRepository;

type UpdateCategoryInput = {
  categoryId: string;
  userId: string;
  data: UpdateCategoryDto;
};

export const makeUpdateCategoryUseCase = (repository: CategoryRepository) => {
  return async ({ categoryId, userId, data }: UpdateCategoryInput) => {
    const category = await repository.findById(categoryId);

    if (!category) {
      throw makeAppError({
        code: "CATEGORY_NOT_FOUND",
        message: "Categoria não encontrada",
        statusCode: 404,
      });
    }

    if (category.userId !== userId) {
      throw makeAppError({
        code: "CATEGORY_ACCESS_DENIED",
        message: "Você não tem permissão para editar esta categoria",
        statusCode: 403,
      });
    }

    if (data.name !== undefined || data.parentId !== undefined) {
      const resultingName = data.name ?? category.name;
      const resultingParentId = data.parentId !== undefined ? data.parentId : (category.parentId ?? undefined);

      const existing = await repository.findByNameAndParent(userId, resultingName, resultingParentId);
      if (existing && existing.id !== categoryId) {
        throw makeAppError({
          code: "CATEGORY_ALREADY_EXISTS",
          message: "Já existe uma categoria com este nome neste nível",
          statusCode: 409,
        });
      }
    }

    return repository.update(categoryId, data);
  };
};
