import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from './unifiedConfig.js';
import { Job } from '../entities/Job.js';
import { User } from '../entities/User.js';
import { Source } from '../entities/Source.js';
import { SavedJob } from '../entities/SavedJob.js';
import { Resume } from '../entities/Resume.js';
import { TailoredResume } from '../entities/TailoredResume.js';
import { EmailSubscription } from '../entities/EmailSubscription.js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.db.url,
  synchronize: config.isDev, // Sync schema automatically in development mode
  logging: config.isDev ? ['query', 'error'] : ['error'],
  entities: [Job, User, Source, SavedJob, Resume, TailoredResume, EmailSubscription],
  migrations: [],
  subscribers: [],
});

export const initializeDatabase = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('📦 Data Source has been initialized!');
    }
  } catch (error) {
    console.error('❌ Error during Data Source initialization', error);
    throw error;
  }
};
