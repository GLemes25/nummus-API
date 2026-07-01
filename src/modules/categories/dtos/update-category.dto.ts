import type { z } from "zod";

import { createCategorySchema } from "./create-category.dto.js";

export const updateCategorySchema = createCategorySchema.partial();

export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
