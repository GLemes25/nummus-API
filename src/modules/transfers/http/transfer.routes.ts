import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { verifyAuth } from "../../../shared/http/hooks/verify-auth.js";
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
        400: z.object({ error: z.string() }),
        404: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      try {
        const userId = request.userId;
        const transfer = await createTransfer({ ...request.body, userId });
        return reply.status(201).send(presentTransfer(transfer));
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "Source and destination wallets cannot be the same") {
            return reply.status(400).send({ error: error.message });
          }
          if (
            error.message === "Source wallet not found" ||
            error.message === "Destination wallet not found"
          ) {
            return reply.status(404).send({ error: error.message });
          }
        }
        throw error;
      }
    },
  });
};
