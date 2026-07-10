import { AppDataSource } from './src/config/data-source.js';
import { alertService } from './src/services/alertService.js';
import { emailSubscriptionRepository } from './src/repositories/EmailSubscriptionRepository.js';

async function run() {
  await AppDataSource.initialize();
  try {
    const sub = await emailSubscriptionRepository.create({
      userId: 'test-user-id', // Needs a valid user ID or foreign key might fail?
      email: 'ahmedtawfik833@gmail.com',
      keywords: ['react'],
      frequency: 'daily',
      isActive: true,
    });
    console.log(sub);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
