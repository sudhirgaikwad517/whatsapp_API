import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config(); // fallback to local app .env if present

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('5000'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  API_BASE_URL: z.string().default('http://localhost:5050'),
  ALLOWED_ORIGINS: z.string().optional().default(''),
  COOKIE_DOMAIN: z.string().optional().default(''),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().optional().transform((val) => {
    if (val) return val;
    const host = process.env.REDIS_HOST || 'redis';
    const port = process.env.REDIS_PORT || '6379';
    return `redis://${host}:${port}`;
  }),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z.string().min(32, 'REFRESH_TOKEN_SECRET must be at least 32 characters'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  META_API_VERSION: z.string().default('v20.0'),
  META_GRAPH_BASE_URL: z.string().default('https://graph.facebook.com'),
  META_APP_ID: z.string().optional().default(''),
  META_APP_SECRET: z.string().optional().default(''),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional().default('prowexa_webhook_secret'),
  META_SYSTEM_USER_TOKEN: z.string().optional().default(''),
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY is required and must be at least 32 characters (no insecure default is provided).'),
  MEDIA_STORAGE_PATH: z.string().default('./uploads'),
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.string().transform(Number).default('587'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default('Prowexa <no-reply@wabtic.com>'),
});

const KNOWN_INSECURE_DEFAULTS = new Set([
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // old ENCRYPTION_KEY default
  'super-secret-jwt-key-change-in-production-32chars',
  'super-secret-refresh-key-change-in-production-32chars',
]);

const parsedEnv = envSchema.parse(process.env);

for (const key of ['JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'ENCRYPTION_KEY'] as const) {
  if (KNOWN_INSECURE_DEFAULTS.has(parsedEnv[key])) {
    throw new Error(
      `${key} is set to a known placeholder/example value from .env.example. ` +
      `Generate a real random secret (e.g. "openssl rand -hex 32") before starting the server.`
    );
  }
}

export const env = parsedEnv;
