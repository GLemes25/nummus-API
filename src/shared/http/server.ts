import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifyApiReference from "@scalar/fastify-api-reference";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { z } from "zod";

import { categoryRoutes } from "../../modules/categories/http/category.routes.js";
import { categoryRepository } from "../../modules/categories/repositories/category.repository.js";
import { costCenterRoutes } from "../../modules/cost-centers/http/cost-center.routes.js";
import { creditCardRoutes } from "../../modules/credit-cards/http/credit-card.routes.js";
import { creditCardRepository } from "../../modules/credit-cards/repositories/credit-card.repository.js";
import { tagRoutes } from "../../modules/tags/http/tag.routes.js";
import { transactionRoutes } from "../../modules/transactions/http/transaction.routes.js";
import { transferRoutes } from "../../modules/transfers/http/transfer.routes.js";
import { walletRoutes } from "../../modules/wallets/http/wallet.routes.js";
import { walletRepository } from "../../modules/wallets/repositories/wallet.repository.js";
import { auth } from "../lib/auth.js";
import { env } from "../lib/env.js";
import { errorHandler } from "./error-handler.js";

const envToLogger = {
  development: {
    transport: {
      target: "pino-pretty",
      options: { translateTime: "HH:MM:ss Z", ignore: "pid,hostname" },
    },
  },
  production: true,
  test: false,
};

export const buildApp = async () => {
  const app = Fastify({ logger: envToLogger[env.NODE_ENV] });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler(errorHandler);

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "nummus-api",
        description: "API para controle financeiro",
        version: "1.0.0",
      },
      servers: [{ url: env.API_BASE_URL, description: "API Base Url" }],
    },
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  });

  app.get("/openapi.json", async () => {
    await app.ready();
    return app.swagger();
  });

  await app.register(fastifyApiReference, {
    routePrefix: "/documentation",
    configuration: {
      sources: [
        { title: "Nummus API", slug: "nummus-api", url: "/openapi.json" },
        {
          title: "Auth API",
          slug: "auth-api",
          url: "/api/auth/open-api/generate-schema",
        },
      ],
    },
  });

  await app.register(fastifyCors, {
    origin: [env.WEB_APP_BASE_URL],
    credentials: true,
  });

  await app.register(walletRoutes, { prefix: "/wallets" });
  await app.register(categoryRoutes, { prefix: "/categories" });
  await app.register(costCenterRoutes, { prefix: "/cost-centers" });
  await app.register(tagRoutes, { prefix: "/tags" });
  await app.register(creditCardRoutes, { prefix: "/credit-cards" });
  await app.register(transferRoutes, { prefix: "/transfers" });
  await app.register(
    transactionRoutes({
      findWallet: walletRepository.findById,
      findCategory: categoryRepository.findById,
      findCreditCard: creditCardRepository.findById,
    }),
    { prefix: "/transactions" },
  );

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/",
    schema: {
      description: "Health check",
      tags: ["Health"],
      response: { 200: z.object({ message: z.string() }) },
    },
    handler: async () => ({ message: "Nummus API is running 🚀" }),
  });

  app.route({
    method: ["GET", "POST", "OPTIONS"],
    url: "/api/auth/*",
    schema: { hide: true },
    async handler(request, reply) {
      if (request.method === "OPTIONS") return reply.status(204).send();
      try {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const headers = new Headers();
        Object.entries(request.headers).forEach(([key, value]) => {
          if (value) headers.append(key, value.toString());
        });
        const body =
          request.method !== "GET" && request.body
            ? JSON.stringify(request.body)
            : null;
        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(body !== null ? { body } : {}),
        });
        const response = await auth.handler(req);
        reply.status(response.status);
        response.headers.forEach((value, key) => {
          reply.header(key, value);
        });
        reply.send(response.body);
      } catch (error) {
        app.log.error(error, "Authentication error");
        reply
          .status(500)
          .send({
            error: "Internal authentication error",
            code: "AUTH_FAILURE",
          });
      }
    },
  });

  return app;
};
