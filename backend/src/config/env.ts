import { z } from 'zod';

const envSchema = z.object({
  // Database — Supabase PostgreSQL
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL:   z.string().optional(),

  // Auth
  JWT_SECRET:     z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRY:     z.string().default('7d'),
  ALLOWED_EMAILS: z.string().default(''),

  // App
  PORT:         z.string().default('4000').transform(Number),
  NODE_ENV:     z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Email — Resend
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM:     z.string().optional().default('DevOS <onboarding@resend.dev>'),

  // Telegram (optional)
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID:   z.string().optional(),

  // Supabase Storage (optional — used for file uploads)
  SUPABASE_URL:            z.string().optional(),
  SUPABASE_SERVICE_KEY:    z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().optional().default('devos-files'),

  // Upstash Redis (optional — used for rate limiting)
  UPSTASH_REDIS_REST_URL:   z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const getAllowedEmails = (): string[] => {
  if (!env.ALLOWED_EMAILS) return [];
  return env.ALLOWED_EMAILS.split(',').map((e) => e.trim().toLowerCase());
};
