// ─── Webhook Routes ──────────────────────────────────────────────
// NOTE: This must receive raw body (no JSON parsing). Mount BEFORE express.json().

import { Router } from 'express';
import express from 'express';
import { SubscriptionController } from '../controllers/SubscriptionController.js';
import { StripeService } from '../services/stripeService.js';
import { userRepository } from '../repositories/UserRepository.js';

const stripeService = new StripeService(userRepository);
const subscriptionController = new SubscriptionController(stripeService);

const router: Router = Router();

// Stripe needs raw body for signature verification
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  subscriptionController.handleWebhook,
);

export { router as webhookRoutes };
