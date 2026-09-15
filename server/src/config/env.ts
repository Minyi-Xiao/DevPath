import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

function resolveEnvPath() {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'server/.env'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

dotenv.config({
  path: resolveEnvPath(),
  override: false,
});

function resolveClientUrl() {
  if (process.env.CLIENT_URL) {
    return process.env.CLIENT_URL;
  }

  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL;
  }

  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }

  return undefined;
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  CLIENT_DIST: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  AUTH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 7),
  AUTH_COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  AUTH_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  RATE_LIMIT_ENABLED: z.enum(['true', 'false']).optional(),
  SITE_ACCESS_PASSWORD: z.string().optional(),
  SITE_GATE_ENABLED: z.enum(['true', 'false']).optional(),
  UPLOAD_DIR: z.string().min(1).default('uploads'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
});

const parsed = envSchema.parse({
  ...process.env,
  CLIENT_URL: resolveClientUrl() ?? process.env.CLIENT_URL,
});

export const env = {
  ...parsed,
  UPLOAD_DIR: path.resolve(parsed.UPLOAD_DIR),
  CLIENT_DIST: parsed.CLIENT_DIST ? path.resolve(parsed.CLIENT_DIST) : undefined,
};
