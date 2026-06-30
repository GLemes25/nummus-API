import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { createWalletSchema, walletResponseSchema } from "../dtos/create-wallet.dto.js";
import { walletRepository } from "../repositories/wallet.repository.js";
import { makeCreateWalletUseCase } from "../use-cases/create-wallet.use-case.js";
import { presentWallet } from "./presenters/wallet.presenter.js";

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

      return reply.status(201).send(presentWallet(wallet));
    },
  });
};
