// --- Subscription Success Page ---

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useCurrentSubscription } from '@/hooks/use-subscription';
import { apiClient } from '@/lib/api';

export default function SubscriptionSuccessPage() {
  const { data: subscription, isLoading, refetch } = useCurrentSubscription();
  const [mounted, setMounted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync subscription from Stripe on page load (in case webhook hasn't processed yet)
  useEffect(() => {
    if (mounted && !isLoading && !isSyncing) {
      // Always sync after checkout to ensure plan is correct
      setIsSyncing(true);
      apiClient
        .post('/api/subscriptions/sync')
        .then(() => {
          refetch();
        })
        .catch((error) => {
          console.error('Failed to sync subscription:', error);
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }
  }, [mounted, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const planName = subscription?.plan || 'Pro';
  const getPlanDescription = (plan: string) => {
    const normalizedPlan = plan?.toUpperCase() || '';
    switch (normalizedPlan) {
      case 'ENTERPRISE':
        return 'Enjoy unlimited job results, advanced analytics, priority support, and dedicated assistance.';
      case 'PRO':
        return 'Enjoy unlimited job results, advanced filters, and priority support.';
      default:
        return 'Your subscription is now active.';
    }
  };

  if (!mounted || isLoading || isSyncing) {
    return (
      <main className="flex min-h-screen flex-col">
        <Header />
        <section className="flex flex-1 items-center justify-center px-4 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <Header />

      <section className="flex flex-1 items-center justify-center px-4 py-20">
        <Card className="mx-auto max-w-md text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Welcome to {planName}!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {getPlanDescription(planName)}
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Link href="/jobs" className={buttonVariants()}>
                Browse Jobs <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="/pricing" className={buttonVariants({ variant: 'outline' })}>
                View Your Plan
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <Footer />
    </main>
  );
}
