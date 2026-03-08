// ─── Express Application ─────────────────────────────────────────

import express, { type Application } from 'express';
import cors from 'cors';
import { config } from './config/unifiedConfig.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalRateLimit } from './middleware/rateLimitMiddleware.js';
import { authRoutes } from './routes/authRoutes.js';
import { jobRoutes } from './routes/jobRoutes.js';
import { sourceRoutes } from './routes/sourceRoutes.js';
import { subscriptionRoutes } from './routes/subscriptionRoutes.js';
import { webhookRoutes } from './routes/webhookRoutes.js';

const app: Application = express();

// ─── Webhook route MUST come before JSON body parsing ────────────
app.use('/api/webhooks', webhookRoutes);

// ─── Global Middleware ───────────────────────────────────────────
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(globalRateLimit);

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
