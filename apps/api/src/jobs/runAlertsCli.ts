import 'dotenv/config';
import { AppDataSource, initializeDatabase } from '../config/data-source.js';
import { AlertService } from '../services/alertService.js';
import { logInfo, logError } from '../lib/logger.js';

async function run() {
  try {
    logInfo('Starting Job Alerts CLI');
    
    // Connect to database if not already connected
    if (!AppDataSource.isInitialized) {
      await initializeDatabase();
      logInfo('Database connected');
    }

    const alertService = new AlertService();
    await alertService.sendAlerts();
    
    logInfo('Job Alerts CLI completed successfully');
    process.exit(0);
  } catch (error) {
    logError('Job Alerts CLI failed', error as Error);
    process.exit(1);
  }
}

run();
