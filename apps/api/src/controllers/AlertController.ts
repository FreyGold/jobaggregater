import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { AlertService } from '../services/alertService.js';

export class AlertController extends BaseController {
  constructor(private alertService: AlertService) {
    super();
  }

  async subscribe(req: Request, res: Response) {
    const { email, keywords, frequency } = req.body;
    const userId = req.user!.userId;

    try {
      const sub = await this.alertService.subscribe(userId, email, keywords, frequency);
      return this.handleSuccess(res, sub, 201);
    } catch (err) {
      return this.handleError(err, res, 'subscribeAlert');
    }
  }

  async list(req: Request, res: Response) {
    const userId = req.user!.userId;
    try {
      const subs = await this.alertService.listSubscriptions(userId);
      return this.handleSuccess(res, subs);
    } catch (err) {
      return this.handleError(err, res, 'listAlerts');
    }
  }

  async unsubscribe(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.userId;
    
    if (!id) {
      res.status(400).json({ error: { message: 'Subscription ID required' } });
      return;
    }

    try {
      await this.alertService.unsubscribe(id as string, userId);
      return this.handleSuccess(res, { success: true });
    } catch (err) {
      return this.handleError(err, res, 'unsubscribeAlert');
    }
  }

  async testAlert(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.userId;
    
    if (!id) {
      res.status(400).json({ error: { message: 'Subscription ID required' } });
      return;
    }

    try {
      await this.alertService.sendTestAlert(id as string, userId);
      return this.handleSuccess(res, { success: true });
    } catch (err) {
      return this.handleError(err, res, 'testAlert');
    }
  }

  async getHistory(req: Request, res: Response) {
    try {
      const history = await this.alertService.getHistory(req.user!.userId);
      return this.handleSuccess(res, history);
    } catch (err) {
      return this.handleError(err, res, 'getHistory');
    }
  }
}
