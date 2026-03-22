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

function optionalNumber(key: string, fallback: number): number {
  const v = process.env[key];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: parseInt(optional('PORT', '3001'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),
  redisUrl: (() => {
    // Prefer full URL if provided
    const url = process.env.REDIS_URL;
    if (url) return url;

    // Otherwise allow Redis Cloud-style discrete settings
    const host = process.env.REDIS_HOST;
    if (!host) return undefined;

    const port = optionalNumber('REDIS_PORT', 6379);
    const username = process.env.REDIS_USERNAME;
    const password = process.env.REDIS_PASSWORD;
    const tls = (process.env.REDIS_TLS ?? 'true').toLowerCase() === 'true';

    const authPart = username
      ? `${encodeURIComponent(username)}${password ? `:${encodeURIComponent(password)}` : ''}@`
      : password
        ? `:${encodeURIComponent(password)}@`
        : '';

    const scheme = tls ? 'rediss' : 'redis';
    return `${scheme}://${authPart}${host}:${port}`;
  })(),
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
    origin: optional(
      'CORS_ORIGIN',
      'http://localhost:3000,http://localhost:8081,https://nimble-buttercream-897ec0.netlify.app/',
    ),
  },

  stripe: {
    secretKey: optional('STRIPE_SECRET_KEY', ''),
    webhookSecret: optional('STRIPE_WEBHOOK_SECRET', ''),
    proPriceId: optional('STRIPE_PRICE_PRO_ID', ''),
    enterprisePriceId: optional('STRIPE_PRICE_ENTERPRISE_ID', ''),
  },

  app: {
    frontendUrl: optional('FRONTEND_URL', 'https://nimble-buttercream-897ec0.netlify.app/'),
  },

  scrape: {
    manualSecret: process.env['SCRAPE_SECRET'],
  },
} as const;
