import 'reflect-metadata';
import { app } from './app.js';
import { config } from './config/unifiedConfig.js';
import { initializeDatabase } from './config/data-source.js';
import { startScraperCron } from './jobs/scraperCron.js';

const startServer = async () => {
  await initializeDatabase();
  startScraperCron();
  
  const server = app.listen(config.port, () => {
    console.log(`
    ┌─────────────────────────────────────────┐
    │  🚀 Job Aggregator API                  │
    │  Running on http://localhost:${config.port}       │
    │  Environment: ${config.nodeEnv.padEnd(22)}│
    └─────────────────────────────────────────┘
    `);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down...');
    server.close(() => process.exit(0));
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
