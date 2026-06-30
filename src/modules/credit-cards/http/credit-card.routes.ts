import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { verifyAuth } from "../../../shared/http/hooks/verify-auth.js";
import { createCreditCardSchema, creditCardResponseSchema } from "../dtos/create-credit-card.dto.js";
import { creditCardRepository } from "../repositories/credit-card.repository.js";
import { makeCreateCreditCardUseCase } from "../use-cases/create-credit-card.use-case.js";
import { presentCreditCard } from "./presenters/credit-card.presenter.js";

export const creditCardRoutes = async (app: FastifyInstance) => {
  const createCreditCard = makeCreateCreditCardUseCase(creditCardRepository);

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Credit Cards"],
      body: createCreditCardSchema,
      response: {
        201: creditCardResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const userId = request.userId;
      const creditCard = await createCreditCard({ ...request.body, userId });
      return reply.status(201).send(presentCreditCard(creditCard));
    },
  });
};
