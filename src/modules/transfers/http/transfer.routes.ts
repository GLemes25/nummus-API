import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { verifyAuth } from "../../../shared/http/hooks/verify-auth.js";
import { appErrorResponseSchema } from "../../../shared/errors/make-app-error.js";
import { createTransferSchema, transferResponseSchema } from "../dtos/create-transfer.dto.js";
import { transferRepository } from "../repositories/transfer.repository.js";
import { makeCreateTransferUseCase } from "../use-cases/create-transfer.use-case.js";
import { presentTransfer } from "./presenters/transfer.presenter.js";

export const transferRoutes = async (app: FastifyInstance) => {
  const createTransfer = makeCreateTransferUseCase(transferRepository);

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Transfers"],
      body: createTransferSchema,
      response: {
        201: transferResponseSchema,
        400: appErrorResponseSchema,
        404: appErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const userId = request.userId;
      const transfer = await createTransfer({ ...request.body, userId });
      return reply.status(201).send(presentTransfer(transfer));
    },
  });
};
