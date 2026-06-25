import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { createWalletSchema } from "../dtos/create-wallet.dto.js";
import { walletRepository } from "../repositories/wallet.repository.js";
import { makeCreateWalletUseCase } from "../use-cases/create-wallet.use-case.js";

const walletResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  currency: z.string(),
  initialBalance: z.number(),
  balance: z.number(),
  isArchived: z.boolean(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const walletRoutes = async (app: FastifyInstance) => {
  const createWallet = makeCreateWalletUseCase(walletRepository);

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      tags: ["Wallets"],
      body: createWalletSchema,
      response: {
        201: walletResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const userId = "id-do-usuario-logado";

      const wallet = await createWallet({ ...request.body, userId });

      return reply.status(201).send({
        ...wallet,
        initialBalance: Number(wallet.initialBalance),
        balance: Number(wallet.balance),
      });
    },
  });
};
