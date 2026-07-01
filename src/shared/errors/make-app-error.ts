import { z } from "zod";

export const appErrorResponseSchema = z.object({
  statusCode: z.number(),
  code: z.string(),
  message: z.string(),
});

export type AppError = Error & {
  code: string;
  statusCode: number;
  isAppError: true;
};

type MakeAppErrorParams = {
  code: string;
  message: string;
  statusCode?: 400 | 403 | 404 | 409 | 500;
};

export const makeAppError = (params: MakeAppErrorParams): AppError => {
  const error = new Error(params.message) as AppError;
  error.code = params.code;
  error.statusCode = params.statusCode ?? 400;
  error.isAppError = true;
  return error;
};

export const isAppError = (error: unknown): error is AppError => {
  return error instanceof Error && (error as AppError).isAppError === true;
};
