import type { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import type { ResumeService } from '../services/resumeService.js';

export class ResumeController extends BaseController {
  constructor(private readonly resumeService: ResumeService) {
    super();
  }

  async upload(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ data: null, error: { message: 'No file provided', code: 'VALIDATION_ERROR' } });
        return;
      }

      const allowed = ['application/pdf', 'text/markdown', 'text/x-markdown', 'text/plain'];
      if (!allowed.includes(file.mimetype) && !file.originalname.endsWith('.md')) {
        res.status(400).json({ data: null, error: { message: 'Invalid file type. PDF or Markdown only.', code: 'VALIDATION_ERROR' } });
        return;
      }

      const result = await this.resumeService.uploadResume(file, req.user!.userId);
      this.handleSuccess(res, result, 201);
    } catch (error) {
      this.handleError(error, res, 'ResumeController.upload');
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.resumeService.listResumes(req.user!.userId);
      this.handleSuccess(res, result);
    } catch (error) {
      this.handleError(error, res, 'ResumeController.list');
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await this.resumeService.deleteResume(req.params.id as string, req.user!.userId);
      this.handleSuccess(res, { deleted: true });
    } catch (error) {
      this.handleError(error, res, 'ResumeController.delete');
    }
  }

  async tailor(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.resumeService.tailorResume(
        req.params.id as string,
        req.user!.userId,
        req.body,
      );
      this.handleSuccess(res, result);
    } catch (error) {
      this.handleError(error, res, 'ResumeController.tailor');
    }
  }

  async extractJobDetails(req: Request, res: Response): Promise<void> {
    try {
      const { url, title, bodyText } = req.body;
      if (!bodyText || typeof bodyText !== 'string') {
        res.status(400).json({ data: null, error: { message: 'bodyText is required', code: 'VALIDATION_ERROR' } });
        return;
      }
      const result = await this.resumeService.extractJobDetails(
        req.user!.userId,
        url,
        title,
        bodyText,
      );
      this.handleSuccess(res, result);
    } catch (error) {
      this.handleError(error, res, 'ResumeController.extractJobDetails');
    }
  }

  async listTailored(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.resumeService.listTailored(req.user!.userId);
      this.handleSuccess(res, result);
    } catch (error) {
      this.handleError(error, res, 'ResumeController.listTailored');
    }
  }

  async getTailoredById(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.resumeService.getTailoredById(req.params.id as string, req.user!.userId);
      this.handleSuccess(res, result);
    } catch (error) {
      this.handleError(error, res, 'ResumeController.getTailoredById');
    }
  }

  async updateTailoredContent(req: Request, res: Response): Promise<void> {
    try {
      const { tailoredContent } = req.body;
      if (!tailoredContent || typeof tailoredContent !== 'string') {
        res.status(400).json({ data: null, error: { message: 'tailoredContent is required', code: 'VALIDATION_ERROR' } });
        return;
      }
      const result = await this.resumeService.updateTailoredContent(
        req.params.id as string,
        req.user!.userId,
        tailoredContent,
      );
      this.handleSuccess(res, result);
    } catch (error) {
      this.handleError(error, res, 'ResumeController.updateTailoredContent');
    }
  }

  async generateCvPdf(req: Request, res: Response): Promise<void> {
    try {
      const { latex } = req.body;
      if (!latex || typeof latex !== 'string') {
        res.status(400).json({ data: null, error: { message: 'latex content is required', code: 'VALIDATION_ERROR' } });
        return;
      }
      const pdf = await this.resumeService.generateCvPdf(latex);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="cv.pdf"');
      res.send(pdf);
    } catch (error) {
      this.handleError(error, res, 'ResumeController.generateCvPdf');
    }
  }

  async deleteTailored(req: Request, res: Response): Promise<void> {
    try {
      await this.resumeService.deleteTailored(req.params.id as string, req.user!.userId);
      this.handleSuccess(res, { deleted: true });
    } catch (error) {
      this.handleError(error, res, 'ResumeController.deleteTailored');
    }
  }
}
