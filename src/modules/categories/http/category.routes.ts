import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { verifyAuth } from "../../../shared/http/hooks/verify-auth.js";
import { appErrorResponseSchema } from "../../../shared/errors/make-app-error.js";
import { createCategorySchema, categoryResponseSchema } from "../dtos/create-category.dto.js";
import { updateCategorySchema } from "../dtos/update-category.dto.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { makeCreateCategoryUseCase } from "../use-cases/create-category.use-case.js";
import { makeGetCategoriesUseCase } from "../use-cases/get-categories.use-case.js";
import { makeUpdateCategoryUseCase } from "../use-cases/update-category.use-case.js";
import { presentCategory } from "./presenters/category.presenter.js";

export const categoryRoutes = async (app: FastifyInstance) => {
  const createCategory = makeCreateCategoryUseCase(categoryRepository);
  const getCategories = makeGetCategoriesUseCase(categoryRepository);
  const updateCategory = makeUpdateCategoryUseCase(categoryRepository);

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Categories"],
      response: {
        200: z.array(categoryResponseSchema),
      },
    },
    handler: async (request, reply) => {
      const userId = request.userId;
      const categories = await getCategories({ userId });
      return reply.status(200).send(categories.map(presentCategory));
    },
  });

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

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "PATCH",
    url: "/:id",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Categories"],
      params: z.object({ id: z.string() }),
      body: updateCategorySchema,
      response: {
        200: categoryResponseSchema,
        403: appErrorResponseSchema,
        404: appErrorResponseSchema,
        409: appErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const userId = request.userId;
      const category = await updateCategory({
        categoryId: request.params.id,
        userId,
        data: request.body,
      });
      return reply.status(200).send(presentCategory(category));
    },
  });
};
