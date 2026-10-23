import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL must be specified"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  ADMIN_SESSION_SECRET: z.string().min(16, "ADMIN_SESSION_SECRET must be at least 16 characters"),
  REPORT_SESSION_SECRET: z.string().min(16, "REPORT_SESSION_SECRET must be at least 16 characters"),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  RATE_LIMIT_URL: z.string().optional(),
  RATE_LIMIT_TOKEN: z.string().optional(),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

import fs from "fs";

let parsedEnv: Env | null = null;

export function getEnv(): Env {
  if (parsedEnv) {
    return parsedEnv;
  }

  if (!process.env.DATABASE_URL) {
    if (fs.existsSync(".env.local")) {
      process.loadEnvFile(".env.local");
    } else if (fs.existsSync(".env")) {
      process.loadEnvFile(".env");
    }
  }

  const isBuildPhase =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build";

  const result = envSchema.safeParse({
    DATABASE_URL:
      process.env.DATABASE_URL ||
      (isBuildPhase
        ? "postgresql://postgres:postgres@localhost:5432/build_placeholder"
        : undefined),
    APP_URL: process.env.APP_URL || "http://localhost:3000",
    NODE_ENV: process.env.NODE_ENV || "development",
    ADMIN_SESSION_SECRET:
      process.env.ADMIN_SESSION_SECRET ||
      (isBuildPhase || process.env.NODE_ENV !== "production"
        ? "dev_admin_session_secret_32_characters_minimum"
        : ""),
    REPORT_SESSION_SECRET:
      process.env.REPORT_SESSION_SECRET ||
      (isBuildPhase || process.env.NODE_ENV !== "production"
        ? "dev_report_session_secret_32_characters_minimum"
        : ""),
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_REGION: process.env.S3_REGION,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    RATE_LIMIT_URL: process.env.RATE_LIMIT_URL,
    RATE_LIMIT_TOKEN: process.env.RATE_LIMIT_TOKEN,
    EMAIL_API_KEY: process.env.EMAIL_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  });

  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format());
    throw new Error("Invalid environment configuration. Check your .env file.");
  }

  parsedEnv = result.data;
  return parsedEnv;
}
