import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { tagRepository } from "../repositories/tag.repository.js";
import type { CreateTagDto } from "../dtos/create-tag.dto.js";

type TagRepository = typeof tagRepository;
type CreateTagInput = CreateTagDto & { userId: string };

export const makeCreateTagUseCase = (repository: TagRepository) => {
  return async (data: CreateTagInput) => {
    const existing = await repository.findByNameAndUser(data.userId, data.name);

    if (existing) {
      throw makeAppError({
        code: "TAG_ALREADY_EXISTS",
        message: "Já existe uma tag com este nome",
        statusCode: 409,
      });
    }

    return repository.create(data);
  };
};
