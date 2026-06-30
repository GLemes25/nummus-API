import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";

import { isAppError } from "../errors/make-app-error.js";

export const errorHandler = (
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply
) => {
  if (hasZodFastifySchemaValidationErrors(error)) {
    const firstIssue = error.validation[0];
    return reply.status(400).send({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: firstIssue?.message ?? "Dados inválidos",
    });
  }

  if (isAppError(error)) {
    return reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
    });
  }

  reply.log.error(error);
  return reply.status(500).send({
    statusCode: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "Erro interno no servidor.",
  });
};
