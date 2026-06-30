import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { verifyAuth } from "../../../shared/http/hooks/verify-auth.js";
import { createCostCenterSchema, costCenterResponseSchema } from "../dtos/create-cost-center.dto.js";
import { costCenterRepository } from "../repositories/cost-center.repository.js";
import { makeCreateCostCenterUseCase } from "../use-cases/create-cost-center.use-case.js";
import { presentCostCenter } from "./presenters/cost-center.presenter.js";

export const costCenterRoutes = async (app: FastifyInstance) => {
  const createCostCenter = makeCreateCostCenterUseCase(costCenterRepository);

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Cost Centers"],
      body: createCostCenterSchema,
      response: {
        201: costCenterResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const userId = request.userId;
      const costCenter = await createCostCenter({ ...request.body, userId });
      return reply.status(201).send(presentCostCenter(costCenter));
    },
  });
};
