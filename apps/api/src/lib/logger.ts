// ─── Logger Utility ───────────────────────────────────────────────────────
// Structured logging with Winston

import winston from 'winston';
import { config } from '../config/unifiedConfig.js';

const logLevel = config.nodeEnv === 'production' ? 'info' : 'debug';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...args } = info;
    const ts = (timestamp as string).slice(0, 19).replace('T', ' ');
    return `${ts} [${level}]: ${message} ${Object.keys(args).length ? JSON.stringify(args, null, 2) : ''}`;
  }),
);

const transports: winston.transport[] = [
  // Console transport (always available)
  new winston.transports.Console(),
];

// Only add file transports in non-serverless environments
if (config.nodeEnv !== 'production') {
  try {
    transports.push(
      // Error log file
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.uncolorize(),
      }),
      // Combined log file
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.uncolorize(),
      }),
    );
  } catch (err) {
    // Silently fail if logs directory can't be created
    console.warn('Could not create log files, using console only');
  }
}

export const logger = winston.createLogger({
  level: logLevel,
  levels,
  format,
  transports,
  defaultMeta: { service: 'job-aggregator-api' },
});

// Convenience methods
export const logInfo = (message: string, meta?: Record<string, any>) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error | unknown, meta?: Record<string, any>) => {
  if (error instanceof Error) {
    logger.error(message, { error: error.message, stack: error.stack, ...meta });
  } else {
    logger.error(message, { error, ...meta });
  }
};

export const logDebug = (message: string, meta?: Record<string, any>) => {
  logger.debug(message, meta);
};

export const logWarn = (message: string, meta?: Record<string, any>) => {
  logger.warn(message, meta);
};
