import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "homologation"])
    .default("development"),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.url(),
  API_BASE_URL: z.url(),
  WEB_APP_BASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
});

export const env = envSchema.parse(process.env);
