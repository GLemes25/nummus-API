import { z } from "zod";

export const createCostCenterSchema = z.object({
  name: z.string().min(1),
});

export type CreateCostCenterDto = z.infer<typeof createCostCenterSchema>;

export const costCenterResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CostCenterResponseDto = z.infer<typeof costCenterResponseSchema>;
