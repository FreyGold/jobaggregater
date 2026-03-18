// ─── Pricing Page ────────────────────────────────────────────────

'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Building2, Zap } from 'lucide-react';
import {
  useSubscriptionPlans,
  useCreateCheckout,
  useCurrentSubscription,
} from '@/hooks/use-subscription';
import { useAuth } from '@/providers/auth-provider';

const PLAN_ICONS: Record<string, React.ElementType> = {
  FREE: Zap,
  PRO: Sparkles,
  ENTERPRISE: Building2,
};

const PLAN_COLORS: Record<string, string> = {
  FREE: 'border-border',
  PRO: 'border-primary ring-2 ring-primary/20',
  ENTERPRISE: 'border-border',
};

export default function PricingPage() {
  const { isAuthenticated } = useAuth();
  const { data: plans, isLoading } = useSubscriptionPlans();
  const { data: currentSub } = useCurrentSubscription();
  const checkout = useCreateCheckout();

  const handleUpgrade = (planId: 'PRO' | 'ENTERPRISE') => {
    if (!isAuthenticated) {
      window.location.href = '/login?redirect=/pricing';
      return;
    }
    checkout.mutate(planId);
  };

  return (
    <main className="flex min-h-screen flex-col">
      <Header />

      <section className="flex flex-1 flex-col items-center px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl text-center">
          {/* Header */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            Simple, transparent pricing
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Choose your plan
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free and scale as you need. Unlock unlimited results, advanced filters, and API
            access.
          </p>

          {/* Plans Grid */}
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse h-96" />
                ))
              : plans?.map((plan) => {
                  const Icon = PLAN_ICONS[plan.id] || Zap;
                  const isCurrentPlan = currentSub?.plan === plan.id;
                  const isPopular = plan.id === 'PRO';

                  return (
                    <Card
                      key={plan.id}
                      className={`relative flex flex-col text-left transition-shadow hover:shadow-lg ${PLAN_COLORS[plan.id]}`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-xs font-semibold">
                            Most Popular
                          </Badge>
                        </div>
                      )}

                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className={`rounded-lg p-2 ${isPopular ? 'bg-primary/10' : 'bg-muted'}`}
                          >
                            <Icon
                              className={`h-5 w-5 ${isPopular ? 'text-primary' : 'text-muted-foreground'}`}
                            />
                          </div>
                        </div>
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        <CardDescription>
                          <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                          {plan.price > 0 && (
                            <span className="text-muted-foreground ml-1">/{plan.interval}</span>
                          )}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="flex-1">
                        <ul className="space-y-3">
                          {plan.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2 text-sm">
                              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <span className="text-muted-foreground">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>

                      <CardFooter>
                        {plan.id === 'FREE' ? (
                          isCurrentPlan ? (
                            <Button variant="outline" className="w-full" disabled>
                              Current Plan
                            </Button>
                          ) : (
                            <Button variant="outline" className="w-full" disabled>
                              Free Forever
                            </Button>
                          )
                        ) : isCurrentPlan ? (
                          <Button variant="outline" className="w-full" disabled>
                            Current Plan
                          </Button>
                        ) : (
                          <Button
                            className="w-full"
                            variant={isPopular ? 'default' : 'outline'}
                            onClick={() => handleUpgrade(plan.id as 'PRO' | 'ENTERPRISE')}
                            disabled={checkout.isPending}
                          >
                            {checkout.isPending ? 'Redirecting...' : `Upgrade to ${plan.name}`}
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
          </div>

          {/* FAQ teaser */}
          <p className="mt-12 text-sm text-muted-foreground">
            All plans include access to 15+ job sources. Need a custom plan?{' '}
            <a
              href="mailto:support@jobagg.com"
              className="text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Contact us
            </a>
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
