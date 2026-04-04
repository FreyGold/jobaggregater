// ─── Subscription Controller ─────────────────────────────────────

import type { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import type { StripeService } from '../services/stripeService.js';
import type { AuthService } from '../services/authService.js';

export class SubscriptionController extends BaseController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly authService?: AuthService,
  ) {
    super();
  }

  getPlans = async (_req: Request, res: Response) => {
    try {
      const plans = this.stripeService.getPlans();
      this.handleSuccess(res, plans);
    } catch (error) {
      this.handleError(error, res, 'SubscriptionController.getPlans');
    }
  };

  createCheckout = async (req: Request, res: Response) => {
    try {
      if (!this.stripeService.isConfigured()) {
        res.status(503).json({
          data: null,
          error: { message: 'Stripe is not configured', code: 'STRIPE_NOT_CONFIGURED' },
        });
        return;
      }
      const { plan } = req.body as { plan: 'PRO' | 'ENTERPRISE' };
      if (!plan || !['PRO', 'ENTERPRISE'].includes(plan)) {
        res.status(400).json({
          data: null,
          error: { message: 'Invalid plan. Must be PRO or ENTERPRISE.', code: 'INVALID_PLAN' },
        });
        return;
      }

      const result = await this.stripeService.createCheckoutSession(
        req.user!.userId,
        req.user!.email,
        plan,
      );
      this.handleSuccess(res, result);
    } catch (error) {
      this.handleError(error, res, 'SubscriptionController.createCheckout');
    }
  };

  createPortal = async (req: Request, res: Response) => {
    try {
      if (!this.stripeService.isConfigured()) {
        res.status(503).json({
          data: null,
          error: { message: 'Stripe is not configured', code: 'STRIPE_NOT_CONFIGURED' },
        });
        return;
      }
      const result = await this.stripeService.createPortalSession(req.user!.userId);
      this.handleSuccess(res, result);
    } catch (error) {
      this.handleError(error, res, 'SubscriptionController.createPortal');
    }
  };

  getCurrentSubscription = async (req: Request, res: Response) => {
    try {
      const user = await this.stripeService['userRepository'].findByIdFull(req.user!.userId);
      if (!user) {
        res.status(404).json({
          data: null,
          error: { message: 'User not found', code: 'USER_NOT_FOUND' },
        });
        return;
      }

      this.handleSuccess(res, {
        plan: user.subscriptionPlan,
        status: user.subscriptionStatus,
        stripeCustomerId: user.stripeCustomerId,
      });
    } catch (error) {
      this.handleError(error, res, 'SubscriptionController.getCurrentSubscription');
    }
  };


  syncSubscription = async (req: Request, res: Response) => {
    try {
      const result = await this.stripeService.syncUserSubscriptionFromStripe(req.user!.userId);
      if (!result) {
        res.status(400).json({
          data: null,
          error: { message: 'Failed to sync subscription', code: 'SYNC_FAILED' },
        });
        return;
      }

      // Generate a fresh token with the updated subscription plan
      let token: string | undefined;
      if (this.authService && result.plan) {
        token = this.authService.generateToken(
          req.user!.userId,
          req.user!.email,
          result.plan as 'FREE' | 'PRO' | 'ENTERPRISE',
        );
      }

      this.handleSuccess(res, {
        plan: result.plan,
        status: result.status,
        subscriptionId: result.subscriptionId,
        synced: result.synced,
        token, // Frontend should update stored token
      });
    } catch (error) {
      this.handleError(error, res, 'SubscriptionController.syncSubscription');
    }
  };

  handleWebhook = async (req: Request, res: Response) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      if (!signature) {
        res.status(400).json({
          data: null,
          error: { message: 'Missing stripe-signature header', code: 'MISSING_SIGNATURE' },
        });
        return;
      }

      const result = await this.stripeService.handleWebhook(req.body, signature);
      this.handleSuccess(res, result);
    } catch (error) {
      this.handleError(error, res, 'SubscriptionController.handleWebhook');
    }
  };
}
