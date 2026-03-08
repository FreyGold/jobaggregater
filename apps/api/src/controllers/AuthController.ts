// ─── Auth Controller ─────────────────────────────────────────────

import type { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import type { AuthService } from '../services/authService.js';

export class AuthController extends BaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.authService.register(req.body);
      this.handleSuccess(res, result, 201);
    } catch (error) {
      this.handleError(error, res, 'AuthController.register');
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.authService.login(req.body);
      this.handleSuccess(res, result);
    } catch (error) {
      this.handleError(error, res, 'AuthController.login');
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
      const user = await this.authService.getProfile(req.user!.userId);
      this.handleSuccess(res, user);
    } catch (error) {
      this.handleError(error, res, 'AuthController.me');
    }
  }
}
