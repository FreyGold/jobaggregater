// ─── Stripe Service ──────────────────────────────────────────────

import Stripe from 'stripe';
import { config } from '../config/unifiedConfig.js';
import { AppError } from '../middleware/errorHandler.js';
import { UserSubscriptionPlan, UserSubscriptionStatus } from '../entities/User.js';
import type { UserRepository } from '../repositories/UserRepository.js';

const stripe = config.stripe.secretKey
  ? new Stripe(config.stripe.secretKey, { apiVersion: '2024-12-18.acacia' as any })
  : null;

function getStripe(): Stripe {
  if (!stripe) {
    throw new AppError(503, 'Stripe is not configured', 'STRIPE_NOT_CONFIGURED');
  }
  return stripe;
}

export class StripeService {
  constructor(private readonly userRepository: UserRepository) {}

  async createOrGetCustomer(userId: string, email: string): Promise<string> {
    const user = await this.userRepository.findByIdFull(userId);
    if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');

    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await getStripe().customers.create({
      email,
      metadata: { userId },
    });

    await this.userRepository.updateSubscription(userId, {
      stripeCustomerId: customer.id,
    });

    return customer.id;
  }

  async createCheckoutSession(userId: string, email: string, plan: 'PRO' | 'ENTERPRISE') {
    const customerId = await this.createOrGetCustomer(userId, email);

    const priceId = plan === 'PRO'
      ? config.stripe.proPriceId
      : config.stripe.enterprisePriceId;

    if (!priceId) {
      throw new AppError(400, `Price not configured for plan: ${plan}`, 'PRICE_NOT_CONFIGURED');
    }

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${config.app.frontendUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.app.frontendUrl}/subscription/cancel`,
      metadata: { userId, plan },
    });

    return { url: session.url, sessionId: session.id };
  }

  async createPortalSession(userId: string) {
    const user = await this.userRepository.findByIdFull(userId);
    if (!user?.stripeCustomerId) {
      throw new AppError(400, 'No Stripe customer found. Subscribe first.', 'NO_STRIPE_CUSTOMER');
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${config.app.frontendUrl}/profile`,
    });

    return { url: session.url };
  }

  async handleWebhook(payload: string | Buffer, signature: string) {
    const event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      config.stripe.webhookSecret,
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as 'PRO' | 'ENTERPRISE';
        if (userId && plan) {
          await this.userRepository.updateSubscription(userId, {
            subscriptionPlan: UserSubscriptionPlan[plan],
            subscriptionStatus: UserSubscriptionStatus.ACTIVE,
            stripeSubscriptionId: session.subscription as string,
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const user = await this.userRepository.findByStripeCustomerId(
          subscription.customer as string,
        );
        if (user) {
          const status = subscription.status === 'active'
            ? UserSubscriptionStatus.ACTIVE
            : subscription.status === 'past_due'
              ? UserSubscriptionStatus.PAST_DUE
              : subscription.status === 'trialing'
                ? UserSubscriptionStatus.TRIALING
                : UserSubscriptionStatus.CANCELED;

          await this.userRepository.updateSubscription(user.id, {
            subscriptionStatus: status,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const user = await this.userRepository.findByStripeCustomerId(
          subscription.customer as string,
        );
        if (user) {
          await this.userRepository.updateSubscription(user.id, {
            subscriptionPlan: UserSubscriptionPlan.FREE,
            subscriptionStatus: UserSubscriptionStatus.CANCELED,
            stripeSubscriptionId: null,
          });
        }
        break;
      }
    }

    return { received: true };
  }

  getPlans() {
    return [
      {
        id: 'FREE' as const,
        name: 'Free',
        price: 0,
        currency: 'usd',
        interval: 'month' as const,
        features: [
          'Up to 100 job results per search',
          'Save up to 10 jobs',
          'Basic search filters',
        ],
        limits: { jobResultsPerPage: 100, savedJobs: 10, rateLimit: 60 },
      },
      {
        id: 'PRO' as const,
        name: 'Pro',
        price: 19,
        currency: 'usd',
        interval: 'month' as const,
        features: [
          'Unlimited job results',
          'Unlimited saved jobs',
          'Advanced filters & alerts',
          'Priority support',
        ],
        limits: { jobResultsPerPage: null, savedJobs: null, rateLimit: 300 },
        stripePriceId: config.stripe.proPriceId || undefined,
      },
      {
        id: 'ENTERPRISE' as const,
        name: 'Enterprise',
        price: 49,
        currency: 'usd',
        interval: 'month' as const,
        features: [
          'Everything in Pro',
          'API access with key',
          'Custom integrations',
          'Dedicated support',
        ],
        limits: { jobResultsPerPage: null, savedJobs: null, rateLimit: 1000 },
        stripePriceId: config.stripe.enterprisePriceId || undefined,
      },
    ];
  }
}
