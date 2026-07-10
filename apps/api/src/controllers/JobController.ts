// ─── Job Controller ──────────────────────────────────────────────

import type { Request, Response } from 'express';
import type { SubscriptionPlan } from '@jobagg/shared';
import { BaseController } from './BaseController.js';
import { AppError } from '../middleware/errorHandler.js';
import type { JobService } from '../services/jobService.js';
import type { JobDescriptionService } from '../services/jobDescriptionService.js';
import type { UserRepository } from '../repositories/UserRepository.js';

export class JobController extends BaseController {
  constructor(
    private readonly jobService: JobService,
    private readonly jobDescriptionService: JobDescriptionService,
    private readonly userRepository?: UserRepository,
  ) {
    super();
  }

  async listJobs(req: Request, res: Response): Promise<void> {
    try {
      // Fetch fresh plan from DB if user is authenticated (JWT may be stale after subscription change)
      let userPlan: SubscriptionPlan = 'FREE';
      if (req.user?.userId && this.userRepository) {
        const user = await this.userRepository.findById(req.user.userId);
        userPlan = (user?.subscriptionPlan as SubscriptionPlan) ?? 'FREE';
      } else if (req.user?.subscriptionPlan) {
        userPlan = req.user.subscriptionPlan;
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
      const status = req.body.status as 'WISHLIST' | 'APPLIED' | 'INTERVIEWING' | 'OFFERED' | 'REJECTED' | undefined;
      await this.jobService.saveJob(req.user!.userId, req.params['jobId'] as string, status);
      this.handleSuccess(res, { message: 'Job saved successfully' }, 201);
    } catch (error) {
      this.handleError(error, res, 'JobController.saveJob');
    }
  };

  updateSavedJobStatus = async (req: Request, res: Response) => {
    try {
      const status = req.body.status as 'WISHLIST' | 'APPLIED' | 'INTERVIEWING' | 'OFFERED' | 'REJECTED';
      if (!status) throw new AppError(400, 'Status is required', 'BAD_REQUEST');
      
      const updated = await this.jobService.updateSavedJobStatus(req.user!.userId, req.params['jobId'] as string, status);
      this.handleSuccess(res, { message: 'Status updated', data: updated });
    } catch (error) {
      this.handleError(error, res, 'JobController.updateSavedJobStatus');
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

  // ─── Enrich job description on-demand
  enrichJobDescription = async (req: Request, res: Response) => {
    try {
      const jobId = req.params['id'] as string;
      const enrichedJob = await this.jobDescriptionService.enrichJobDescription(jobId);
      this.handleSuccess(res, enrichedJob);
    } catch (error) {
      this.handleError(error, res, 'JobController.enrichJobDescription');
    }
  };

  // ─── Score ATS Match (Authenticated)
  scoreJob = async (req: Request, res: Response) => {
    try {
      const { resumeId } = req.body;
      if (!resumeId) throw new AppError(400, 'Resume ID is required', 'BAD_REQUEST');

      const jobId = req.params['id'] as string;
      const job = await this.jobService.getJob(jobId);
      if (!job) throw new AppError(404, 'Job not found', 'NOT_FOUND');

      const { ResumeService } = await import('../services/resumeService.js');
      const resumeService = new ResumeService();
      
      const result = await resumeService.scoreMatch(
        resumeId,
        req.user!.userId,
        job.title,
        job.description || job.title,
      );

      this.handleSuccess(res, result);
    } catch (error) {
      this.handleError(error, res, 'JobController.scoreJob');
    }
  };
}
