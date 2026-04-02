// ─── Stripe Service ──────────────────────────────────────────────

import Stripe from 'stripe';
import { config } from '../config/unifiedConfig.js';
import { AppError } from '../middleware/errorHandler.js';
import { logInfo, logWarn, logError } from '../lib/logger.js';
import { UserSubscriptionPlan, UserSubscriptionStatus } from '../entities/User.js';
import type { UserRepository } from '../repositories/UserRepository.js';

// Debug: Log Stripe configuration status
const isStripeConfigured = Boolean(config.stripe.secretKey);
console.log(
  `[StripeService] Stripe ${isStripeConfigured ? 'configured' : 'not configured'} - pricing will ${isStripeConfigured ? 'include' : 'exclude'} stripe price IDs`,
);

let stripe: Stripe | null = null;
try {
  stripe = config.stripe.secretKey
    ? new Stripe(config.stripe.secretKey, { apiVersion: '2024-12-18.acacia' as any })
    : null;
} catch (err) {
  console.warn('[StripeService] Failed to initialize Stripe client:', (err as Error).message);
  stripe = null;
}

function getStripe(): Stripe {
  if (!stripe) {
    throw new AppError(503, 'Stripe is not configured', 'STRIPE_NOT_CONFIGURED');
  }
  return stripe;
}

export class StripeService {
  constructor(private readonly userRepository: UserRepository) {}

  isConfigured(): boolean {
    // Check if Stripe client is initialized AND price IDs are set
    if (!stripe) {
      return false;
    }

    // Price IDs must be set (not empty)
    if (!config.stripe.proPriceId || !config.stripe.enterprisePriceId) {
      return false;
    }

    return true;
  }

  isPriceIdValid(priceId: string | undefined): boolean {
    // Validate price ID format (must start with 'price_')
    if (!priceId) return false;
    return priceId.toString().startsWith('price_');
  }

  private resolvePlanFromPriceId(priceId?: string | null): UserSubscriptionPlan | null {
    if (!priceId) return null;
    if (priceId === config.stripe.proPriceId) return UserSubscriptionPlan.PRO;
    if (priceId === config.stripe.enterprisePriceId) return UserSubscriptionPlan.ENTERPRISE;
    return null;
  }

  private resolvePlanFromSubscription(subscription?: Stripe.Subscription | null): UserSubscriptionPlan | null {
    if (!subscription) return null;
    const priceId = subscription.items?.data?.[0]?.price?.id;
    return this.resolvePlanFromPriceId(priceId);
  }

  private resolveStatusFromSubscription(subscription?: Stripe.Subscription | null): UserSubscriptionStatus {
    if (!subscription) return UserSubscriptionStatus.ACTIVE;
    return subscription.status === 'active'
      ? UserSubscriptionStatus.ACTIVE
      : subscription.status === 'past_due'
        ? UserSubscriptionStatus.PAST_DUE
        : subscription.status === 'trialing'
          ? UserSubscriptionStatus.TRIALING
          : UserSubscriptionStatus.CANCELED;
  }

  async createOrGetCustomer(userId: string, email: string): Promise<string> {
    const user = await this.userRepository.findByIdFull(userId);
    if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');

    // If customer ID exists, verify it's still valid in Stripe
    if (user.stripeCustomerId) {
      try {
        await getStripe().customers.retrieve(user.stripeCustomerId);
        return user.stripeCustomerId;
      } catch (error: any) {
        // Customer doesn't exist in Stripe anymore, create a new one
        logWarn('Stored Stripe customer no longer exists, creating new one', {
          userId,
          oldCustomerId: user.stripeCustomerId,
          error: error.message,
        });
      }
    }

    // Create new customer
    const customer = await getStripe().customers.create({
      email,
      metadata: { userId },
    });

    // Update database with new customer ID
    await this.userRepository.updateSubscription(userId, {
      stripeCustomerId: customer.id,
    });

    logInfo('Created new Stripe customer', {
      userId,
      customerId: customer.id,
    });

    return customer.id;
  }

  async createCheckoutSession(userId: string, email: string, plan: 'PRO' | 'ENTERPRISE') {
    const customerId = await this.createOrGetCustomer(userId, email);

    const priceId = plan === 'PRO'
      ? config.stripe.proPriceId
      : config.stripe.enterprisePriceId;

    // Validate price ID
    if (!priceId) {
      throw new AppError(
        400, 
        `Price not configured for plan: ${plan}. Set STRIPE_PRICE_${plan}_ID in .env`, 
        'PRICE_NOT_CONFIGURED'
      );
    }

    // Validate price ID format (must be 'price_xxx' not a number)
    if (!priceId.toString().startsWith('price_')) {
      logError('Invalid Stripe price ID format', {
        plan,
        priceId,
        expected: 'price_xxx format from Stripe Dashboard',
      });
      throw new AppError(
        400,
        `Invalid price ID for ${plan}: "${priceId}". Price IDs must start with "price_". ` +
        `Get the correct ID from https://dashboard.stripe.com/test/products`,
        'INVALID_PRICE_ID'
      );
    }

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { userId, plan },
      },
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
        const plan = session.metadata?.plan as 'PRO' | 'ENTERPRISE' | undefined;
        const subscriptionId = session.subscription as string | undefined;
        const subscription = subscriptionId
          ? await getStripe().subscriptions.retrieve(subscriptionId)
          : null;
        const resolvedPlan = this.resolvePlanFromSubscription(subscription)
          ?? (plan ? UserSubscriptionPlan[plan] : null);
        if (userId && resolvedPlan) {
          await this.userRepository.updateSubscription(userId, {
            subscriptionPlan: resolvedPlan,
            subscriptionStatus: this.resolveStatusFromSubscription(subscription),
            stripeSubscriptionId: subscriptionId ?? null,
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const user = await this.userRepository.findByStripeCustomerId(
          subscription.customer as string,
        );
        if (user) {
          const resolvedPlan = this.resolvePlanFromSubscription(subscription);
          await this.userRepository.updateSubscription(user.id, {
            subscriptionStatus: this.resolveStatusFromSubscription(subscription),
            ...(resolvedPlan ? { subscriptionPlan: resolvedPlan } : {}),
            stripeSubscriptionId: subscription.id ?? user.stripeSubscriptionId,
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

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const user = await this.userRepository.findByStripeCustomerId(
          invoice.customer as string,
        );
        if (user) {
          // Invoice is paid, update status to ACTIVE
          await this.userRepository.updateSubscription(user.id, {
            subscriptionStatus: UserSubscriptionStatus.ACTIVE,
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const user = await this.userRepository.findByStripeCustomerId(
          invoice.customer as string,
        );
        if (user) {
          await this.userRepository.updateSubscription(user.id, {
            subscriptionStatus: UserSubscriptionStatus.PAST_DUE,
          });
        }
        break;
      }
    }

    return { received: true };
  }

  getPlans() {
    const stripeConfigured = this.isConfigured();
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
        stripePriceId: stripeConfigured ? config.stripe.proPriceId || undefined : undefined,
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
        stripePriceId: stripeConfigured ? config.stripe.enterprisePriceId || undefined : undefined,
      },
    ];
  }

  // Sync user's subscription from Stripe (for use without webhooks)
  async syncUserSubscriptionFromStripe(userId: string) {
    const user = await this.userRepository.findByIdFull(userId);
    if (!user || !user.stripeCustomerId) {
      return null;
    }

    try {
      // Verify customer still exists in Stripe
      await getStripe().customers.retrieve(user.stripeCustomerId);

      const subscriptions = await getStripe().subscriptions.list({
        customer: user.stripeCustomerId,
        limit: 1,
        status: 'all',
      });

      const subscription = subscriptions.data[0];
      if (subscription) {
        const resolvedPlan = this.resolvePlanFromSubscription(subscription);
        const resolvedStatus = this.resolveStatusFromSubscription(subscription);
        
        await this.userRepository.updateSubscription(userId, {
          ...(resolvedPlan ? { subscriptionPlan: resolvedPlan } : {}),
          subscriptionStatus: resolvedStatus,
          stripeSubscriptionId: subscription.id,
        });

        return {
          plan: resolvedPlan,
          status: resolvedStatus,
          subscriptionId: subscription.id,
          synced: true,
        };
      } else {
        // No active subscription, downgrade to FREE
        await this.userRepository.updateSubscription(userId, {
          subscriptionPlan: UserSubscriptionPlan.FREE,
          subscriptionStatus: UserSubscriptionStatus.CANCELED,
          stripeSubscriptionId: null,
        });

        return {
          plan: UserSubscriptionPlan.FREE,
          status: UserSubscriptionStatus.CANCELED,
          synced: true,
        };
      }
    } catch (err) {
      console.error('[StripeService] Failed to sync subscription from Stripe:', err);
      return null;
    }
  }

}
