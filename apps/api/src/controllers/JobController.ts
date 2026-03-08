// ─── Job Controller ──────────────────────────────────────────────

import type { Request, Response } from 'express';
import type { SubscriptionPlan } from '@jobagg/shared';
import { BaseController } from './BaseController.js';
import type { JobService } from '../services/jobService.js';
import type { UserRepository } from '../repositories/UserRepository.js';

export class JobController extends BaseController {
  constructor(
    private readonly jobService: JobService,
    private readonly userRepo: UserRepository,
  ) {
    super();
  }

  async listJobs(req: Request, res: Response): Promise<void> {
    try {
      // Determine user's subscription plan (default FREE for anonymous)
      let userPlan: SubscriptionPlan = 'FREE';
      if (req.user?.userId) {
        const user = await this.userRepo.findById(req.user.userId);
        if (user) {
          userPlan = user.subscriptionPlan as SubscriptionPlan;
        }
      }
      const result = await this.jobService.listJobs(req.query as never, userPlan);
      this.handlePaginatedSuccess(res, result.data, result.meta);
    } catch (error) {
      this.handleError(error, res, 'JobController.listJobs');
    }
  }

  // ─── Get single job
  getJob = async (req: Request, res: Response) => {
    try {
      const job = await this.jobService.getJob(req.params['id'] as string);
      this.handleSuccess(res, job);
    } catch (error) {
      this.handleError(error, res, 'JobController.getJob');
    }
  };

  async searchJobs(req: Request, res: Response): Promise<void> {
    try {
      const keyword = req.query['q'] as string;
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20;
      const jobs = await this.jobService.searchJobs(keyword, limit);
      this.handleSuccess(res, jobs);
    } catch (error) {
      this.handleError(error, res, 'JobController.searchJobs');
    }
  }

  // ─── Save job (Authenticated)
  saveJob = async (req: Request, res: Response) => {
    try {
      await this.jobService.saveJob(req.user!.userId, req.params['jobId'] as string);
      this.handleSuccess(res, { message: 'Job saved successfully' }, 201);
    } catch (error) {
      this.handleError(error, res, 'JobController.saveJob');
    }
  };

  // ─── Unsave job (Authenticated)
  unsaveJob = async (req: Request, res: Response) => {
    try {
      await this.jobService.unsaveJob(req.user!.userId, req.params['jobId'] as string);
      this.handleSuccess(res, { message: 'Job unsaved successfully' });
    } catch (error) {
      this.handleError(error, res, 'JobController.unsaveJob');
    }
  };

  async getSavedJobs(req: Request, res: Response): Promise<void> {
    try {
      const jobs = await this.jobService.getSavedJobs(req.user!.userId);
      this.handleSuccess(res, jobs);
    } catch (error) {
      this.handleError(error, res, 'JobController.getSavedJobs');
    }
  }
}
