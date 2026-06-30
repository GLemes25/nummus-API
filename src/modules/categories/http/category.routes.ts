import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { verifyAuth } from "../../../shared/http/hooks/verify-auth.js";
import { createCategorySchema, categoryResponseSchema } from "../dtos/create-category.dto.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { makeCreateCategoryUseCase } from "../use-cases/create-category.use-case.js";
import { presentCategory } from "./presenters/category.presenter.js";

export const categoryRoutes = async (app: FastifyInstance) => {
  const createCategory = makeCreateCategoryUseCase(categoryRepository);

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Categories"],
      body: createCategorySchema,
      response: {
        201: categoryResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const userId = request.userId;
      const category = await createCategory({ ...request.body, userId });
      return reply.status(201).send(presentCategory(category));
    },
  });
};
