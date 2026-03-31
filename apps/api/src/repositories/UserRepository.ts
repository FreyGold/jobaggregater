// ─── User Repository ─────────────────────────────────────────────

import { AppDataSource } from '../config/data-source.js';
import { User } from '../entities/User.js';
import { SavedJob } from '../entities/SavedJob.js';

export class UserRepository {
  private repo = AppDataSource.getRepository(User);
  private savedJobRepo = AppDataSource.getRepository(SavedJob);

  async findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async findById(id: string) {
    return this.repo.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'subscriptionPlan', 'subscriptionStatus', 'createdAt'],
    });
  }

  /** Full user record (excludes passwordHash) — useful for subscription checks */
  async findByIdFull(id: string) {
    return this.repo.findOne({
      where: { id },
      select: [
        'id', 'email', 'name',
        'subscriptionPlan', 'subscriptionStatus',
        'stripeCustomerId', 'stripeSubscriptionId',
        'createdAt',
      ],
    });
  }

  async findByStripeCustomerId(stripeCustomerId: string) {
    return this.repo.findOne({ where: { stripeCustomerId } });
  }

  async create(data: { email: string; passwordHash: string; name: string }) {
    const user = this.repo.create(data);
    const savedUser = await this.repo.save(user);
    return {
      id: savedUser.id,
      email: savedUser.email,
      name: savedUser.name,
      subscriptionPlan: savedUser.subscriptionPlan,
      subscriptionStatus: savedUser.subscriptionStatus,
      createdAt: savedUser.createdAt,
    };
  }

  async updateSubscription(userId: string, data: Partial<User>) {
    await this.repo.update(userId, data);
  }

  async getSavedJobs(userId: string) {
    return this.savedJobRepo.createQueryBuilder('saved')
      .leftJoinAndSelect('saved.job', 'job')
      .where('saved.userId = :userId', { userId })
      .orderBy('saved.createdAt', 'DESC')
      .getMany();
  }

  async saveJob(userId: string, jobId: string) {
    const savedJob = this.savedJobRepo.create({ userId, jobId });
    return this.savedJobRepo.save(savedJob);
  }

  async unsaveJob(userId: string, jobId: string) {
    await this.savedJobRepo.delete({ userId, jobId });
    return { count: 1 };
  }

  async isJobSaved(userId: string, jobId: string) {
    const saved = await this.savedJobRepo.findOne({
      where: { userId, jobId },
    });
    return !!saved;
  }

  async countSavedJobs(userId: string) {
    return this.savedJobRepo.count({ where: { userId } });
  }
}

export const userRepository = new UserRepository();

