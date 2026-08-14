import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config(); // fallback to local app .env if present

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('5000'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().optional().transform((val) => {
    if (val) return val;
    const host = process.env.REDIS_HOST || 'redis';
    const port = process.env.REDIS_PORT || '6379';
    return `redis://${host}:${port}`;
  }),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z.string().min(16, 'REFRESH_TOKEN_SECRET must be at least 16 characters'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  META_API_VERSION: z.string().default('v20.0'),
  META_GRAPH_BASE_URL: z.string().default('https://graph.facebook.com'),
  META_APP_ID: z.string().optional().default(''),
  META_APP_SECRET: z.string().optional().default(''),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional().default('prowexa_webhook_secret'),
  META_SYSTEM_USER_TOKEN: z.string().optional().default(''),
  ENCRYPTION_KEY: z.string().min(16).default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  MEDIA_STORAGE_PATH: z.string().default('./uploads'),
});

export const env = envSchema.parse(process.env);
