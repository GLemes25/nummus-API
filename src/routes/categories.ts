import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { createCategory, getUserCategories } from "../usecases/category.js";

const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const categoryRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      tags: ["Categories"],
      body: z.object({
        name: z.string().min(1),
        color: z.string().optional(),
      }),
      response: {
        201: categorySchema,
      },
    },
    handler: async (request, reply) => {
      const userId = "id-do-usuario-logado";
      const category = await createCategory({
        name: request.body.name,
        ...(request.body.color !== undefined ? { color: request.body.color } : {}),
        userId,
      });
      return reply.status(201).send(category);
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/",
    schema: {
      tags: ["Categories"],
      response: {
        200: z.array(categorySchema),
      },
    },
    handler: async (_request, reply) => {
      const userId = "id-do-usuario-logado";
      const categories = await getUserCategories(userId);
      return reply.status(200).send(categories);
    },
  });
};
