import type { tagRepository } from "../repositories/tag.repository.js";
import type { CreateTagDto } from "../dtos/create-tag.dto.js";

type TagRepository = typeof tagRepository;
type CreateTagInput = CreateTagDto & { userId: string };

export const makeCreateTagUseCase = (repository: TagRepository) => {
  return async (data: CreateTagInput) => {
    const existing = await repository.findByNameAndUser(data.userId, data.name);

    if (existing) {
      throw new Error("A tag with this name already exists");
    }

    return repository.create(data);
  };
};
