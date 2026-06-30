import type { Tag } from "@prisma/client";

import type { TagResponseDto } from "../../dtos/create-tag.dto.js";

export const presentTag = (tag: Tag): TagResponseDto => ({
  id: tag.id,
  name: tag.name,
  userId: tag.userId,
  createdAt: tag.createdAt,
});
