// ─── Express Application ─────────────────────────────────────────

import express, { type Application } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/unifiedConfig.js';
import { specs } from './config/swagger.js';
import { AppDataSource, initializeDatabase } from './config/data-source.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalRateLimit } from './middleware/rateLimitMiddleware.js';
import { authRoutes } from './routes/authRoutes.js';
import { jobRoutes } from './routes/jobRoutes.js';
import { sourceRoutes } from './routes/sourceRoutes.js';
import { subscriptionRoutes } from './routes/subscriptionRoutes.js';
import { webhookRoutes } from './routes/webhookRoutes.js';
import cronRoutes from './routes/cronRoutes.js';
import { resumeRoutes } from './routes/resumeRoutes.js';
import { settingsRoutes } from './routes/settingsRoutes.js';

const app: Application = express();
let dbInitPromise: Promise<void> | null = null;

function ensureDatabaseReady(): Promise<void> {
  if (AppDataSource.isInitialized) return Promise.resolve();
  if (!dbInitPromise) {
    dbInitPromise = initializeDatabase();
  }
  return dbInitPromise;
}

// ─── Webhook route MUST come before JSON body parsing ────────────
app.use('/api/webhooks', webhookRoutes);

// ─── Global Middleware ───────────────────────────────────────────
const normalizeOrigin = (value: string): string => value.trim().replace(/\/$/, '');
const allowedOrigins = new Set(
  config.cors.origin
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean),
);
const addOrigin = (value: string): void => {
  const normalized = normalizeOrigin(value);
  if (normalized) allowedOrigins.add(normalized);
};
addOrigin(config.app.frontendUrl);
addOrigin(config.api.url);
addOrigin(`http://localhost:${config.port}`);
addOrigin(`http://127.0.0.1:${config.port}`);

app.use(cors({ 
  origin: function(origin, callback) {
    const normalizedOrigin = origin ? normalizeOrigin(origin) : '';
    if (!origin || allowedOrigins.has(normalizedOrigin) || origin?.startsWith('chrome-extension://')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }, 
  credentials: true 
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(globalRateLimit);
app.use(async (_req, _res, next) => {
  try {
    await ensureDatabaseReady();
    next();
  } catch (err) {
    next(err);
  }
});

// ─── Health Check ────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Documentation ───────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  swaggerOptions: {
    persistAuthorization: true,
    displayOperationId: true,
  },
  customCss: '.swagger-ui .topbar { display: none }',
}));

// ─── Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/settings', settingsRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    data: null,
    error: { message: 'Route not found', code: 'NOT_FOUND' },
  });
});

// ─── Error Handler (must be last) ────────────────────────────────
app.use(errorHandler);

export { app };
export default app;
