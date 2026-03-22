// ─── Express Application ─────────────────────────────────────────

import express, { type Application } from 'express';
import cors from 'cors';
import { config } from './config/unifiedConfig.js';
import { AppDataSource, initializeDatabase } from './config/data-source.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalRateLimit } from './middleware/rateLimitMiddleware.js';
import { authRoutes } from './routes/authRoutes.js';
import { jobRoutes } from './routes/jobRoutes.js';
import { sourceRoutes } from './routes/sourceRoutes.js';
import { subscriptionRoutes } from './routes/subscriptionRoutes.js';
import { webhookRoutes } from './routes/webhookRoutes.js';

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
const allowedOrigins = config.cors.origin.split(',').map(o => o.trim());

app.use(cors({ 
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
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

// ─── Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

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
