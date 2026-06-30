import type { costCenterRepository } from "../repositories/cost-center.repository.js";
import type { CreateCostCenterDto } from "../dtos/create-cost-center.dto.js";

type CostCenterRepository = typeof costCenterRepository;
type CreateCostCenterInput = CreateCostCenterDto & { userId: string };

export const makeCreateCostCenterUseCase = (repository: CostCenterRepository) => {
  return async (data: CreateCostCenterInput) => {
    const existing = await repository.findByNameAndUser(data.userId, data.name);

    if (existing) {
      throw new Error("A cost center with this name already exists");
    }

    return repository.create(data);
  };
};
