// ─── Source Repository ───────────────────────────────────────────

import { AppDataSource } from '../config/data-source.js';
import { Source } from '../entities/Source.js';

export class SourceRepository {
  private repo = AppDataSource.getRepository(Source);

  async findAll() {
    // We can't directly map relation counts exactly like Prisma without a custom query
    // or explicit property. We'll return just the source data for now as the basic entity.
    return this.repo.find({
      order: { name: 'ASC' },
      // To get job counts, we'd typically add a subquery or relation count builder
      // For now, let's keep it simple to fix compilation
    });
  }

  async findByScraperKey(scraperKey: string) {
    return this.repo.findOne({ where: { scraperKey } });
  }

  async updateLastScraped(id: string) {
    await this.repo.update(id, { lastScrapedAt: new Date() });
    return this.repo.findOne({ where: { id } });
  }
}

export const sourceRepository = new SourceRepository();
