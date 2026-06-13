import { AppDataSource } from '../config/data-source.js';
import { Resume } from '../entities/Resume.js';
import { TailoredResume } from '../entities/TailoredResume.js';

export class ResumeRepository {
  private resumeRepo = AppDataSource.getRepository(Resume);
  private tailoredRepo = AppDataSource.getRepository(TailoredResume);

  async findByUserId(userId: string): Promise<Resume[]> {
    return this.resumeRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Resume | null> {
    return this.resumeRepo.findOne({ where: { id } });
  }

  async create(data: {
    userId: string;
    fileName: string;
    fileType: string;
    content: string;
  }): Promise<Resume> {
    const resume = this.resumeRepo.create(data);
    return this.resumeRepo.save(resume);
  }

  async delete(id: string): Promise<void> {
    await this.tailoredRepo.delete({ resumeId: id });
    await this.resumeRepo.delete(id);
  }

  async findTailoredByUserId(userId: string): Promise<TailoredResume[]> {
    return this.tailoredRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findTailoredById(id: string): Promise<TailoredResume | null> {
    return this.tailoredRepo.findOne({ where: { id } });
  }

  async createTailored(data: {
    resumeId: string;
    userId: string;
    jobTitle: string;
    companyName: string;
    jobDescription: string;
    jobUrl?: string;
    score: number;
    tailoredContent: string;
  }): Promise<TailoredResume> {
    const t = this.tailoredRepo.create(data);
    return this.tailoredRepo.save(t);
  }

  async countTailoredByUserId(userId: string): Promise<number> {
    return this.tailoredRepo.count({ where: { userId } });
  }

  async updateTailored(
    id: string,
    userId: string,
    data: { tailoredContent: string },
  ): Promise<TailoredResume | null> {
    const t = await this.tailoredRepo.findOne({ where: { id, userId } });
    if (!t) return null;
    t.tailoredContent = data.tailoredContent;
    return this.tailoredRepo.save(t);
  }

  async deleteTailored(id: string, userId: string): Promise<void> {
    await this.tailoredRepo.delete({ id, userId });
  }
}

export const resumeRepository = new ResumeRepository();
