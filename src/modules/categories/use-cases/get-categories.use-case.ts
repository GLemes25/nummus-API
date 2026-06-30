import type { categoryRepository } from "../repositories/category.repository.js";

type CategoryRepository = typeof categoryRepository;

type GetCategoriesInput = {
  userId: string;
};

export const makeGetCategoriesUseCase = (repository: CategoryRepository) => {
  return async (data: GetCategoriesInput) => {
    return repository.findManyByUser(data.userId);
  };
};
