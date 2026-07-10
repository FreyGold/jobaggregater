import { AppDataSource } from '../config/data-source.js';
import { EmailSubscription } from '../entities/EmailSubscription.js';
import { Repository } from 'typeorm';

class EmailSubscriptionRepository {
  private repo: Repository<EmailSubscription>;

  constructor() {
    this.repo = AppDataSource.getRepository(EmailSubscription);
  }

  async findByUserId(userId: string): Promise<EmailSubscription[]> {
    return this.repo.find({ where: { userId } });
  }

  async findActiveSubscriptions(): Promise<EmailSubscription[]> {
    return this.repo.find({ where: { isActive: true }, relations: ['user'] });
  }

  async create(data: Partial<EmailSubscription>): Promise<EmailSubscription> {
    const sub = this.repo.create(data);
    return this.repo.save(sub);
  }

  async update(id: string, data: Partial<Omit<EmailSubscription, 'user'>>): Promise<void> {
    await this.repo.update(id, data as any);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async findById(id: string): Promise<EmailSubscription | null> {
    return this.repo.findOne({ where: { id } });
  }
}

export const emailSubscriptionRepository = new EmailSubscriptionRepository();
