// ─── Subscription Routes ─────────────────────────────────────────

import { Router } from 'express';
import { SubscriptionController } from '../controllers/SubscriptionController.js';
import { StripeService } from '../services/stripeService.js';
import { userRepository } from '../repositories/UserRepository.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncErrorWrapper } from '../utils/index.js';

const stripeService = new StripeService(userRepository);
const subscriptionController = new SubscriptionController(stripeService);

const router: Router = Router();

// Public — list available plans
router.get('/plans', asyncErrorWrapper(subscriptionController.getPlans));

// Authenticated — create checkout session
router.post(
  '/checkout',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper(subscriptionController.createCheckout),
);

// Authenticated — create customer portal session
router.post(
  '/portal',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper(subscriptionController.createPortal),
);

// Authenticated — get current subscription status
router.get(
  '/current',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper(subscriptionController.getCurrentSubscription),
);


// Authenticated — sync subscription from Stripe (on-demand)
router.post(
  '/sync',
  asyncErrorWrapper(authMiddleware as never),
  asyncErrorWrapper(subscriptionController.syncSubscription),
);

export { router as subscriptionRoutes };
