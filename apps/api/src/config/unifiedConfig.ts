// ─── Unified Configuration ───────────────────────────────────────
// Single source of truth for all config. Never use process.env directly.

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: parseInt(optional('PORT', '3001'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),
  redisUrl: process.env.REDIS_URL,
  isDev: optional('NODE_ENV', 'development') === 'development',
  isProd: process.env['NODE_ENV'] === 'production',

  db: {
    url: required('DATABASE_URL'),
  },

  auth: {
    jwtSecret: required('JWT_SECRET'),
    jwtExpiresIn: optional('JWT_EXPIRES_IN', '7d'),
  },

  cors: {
    origin: optional('CORS_ORIGIN', 'http://localhost:3000,http://localhost:8081'),
  },

  stripe: {
    secretKey: optional('STRIPE_SECRET_KEY', ''),
    webhookSecret: optional('STRIPE_WEBHOOK_SECRET', ''),
    proPriceId: optional('STRIPE_PRICE_PRO_ID', ''),
    enterprisePriceId: optional('STRIPE_PRICE_ENTERPRISE_ID', ''),
  },

  app: {
    frontendUrl: optional('FRONTEND_URL', 'http://localhost:3000'),
  },
} as const;
