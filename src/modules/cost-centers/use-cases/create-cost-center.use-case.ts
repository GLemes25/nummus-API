import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { costCenterRepository } from "../repositories/cost-center.repository.js";
import type { CreateCostCenterDto } from "../dtos/create-cost-center.dto.js";

type CostCenterRepository = typeof costCenterRepository;
type CreateCostCenterInput = CreateCostCenterDto & { userId: string };

export const makeCreateCostCenterUseCase = (repository: CostCenterRepository) => {
  return async (data: CreateCostCenterInput) => {
    const existing = await repository.findByNameAndUser(data.userId, data.name);

    if (existing) {
      throw makeAppError({
        code: "COST_CENTER_ALREADY_EXISTS",
        message: "Já existe um centro de custo com este nome",
        statusCode: 409,
      });
    }

    return repository.create(data);
  };
};
