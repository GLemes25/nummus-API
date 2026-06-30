import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { verifyAuth } from "../../../shared/http/hooks/verify-auth.js";
import { createTagSchema, tagResponseSchema } from "../dtos/create-tag.dto.js";
import { tagRepository } from "../repositories/tag.repository.js";
import { makeCreateTagUseCase } from "../use-cases/create-tag.use-case.js";
import { presentTag } from "./presenters/tag.presenter.js";

export const tagRoutes = async (app: FastifyInstance) => {
  const createTag = makeCreateTagUseCase(tagRepository);

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Tags"],
      body: createTagSchema,
      response: {
        201: tagResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const userId = request.userId;
      const tag = await createTag({ ...request.body, userId });
      return reply.status(201).send(presentTag(tag));
    },
  });
};
