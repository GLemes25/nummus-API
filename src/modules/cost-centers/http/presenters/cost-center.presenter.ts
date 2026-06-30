import type { CostCenter } from "@prisma/client";

import type { CostCenterResponseDto } from "../../dtos/create-cost-center.dto.js";

export const presentCostCenter = (costCenter: CostCenter): CostCenterResponseDto => ({
  id: costCenter.id,
  name: costCenter.name,
  userId: costCenter.userId,
  createdAt: costCenter.createdAt,
  updatedAt: costCenter.updatedAt,
});
