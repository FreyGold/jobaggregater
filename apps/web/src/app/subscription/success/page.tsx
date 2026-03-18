// ─── Subscription Success Page ───────────────────────────────────

'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function SubscriptionSuccessPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <Header />

      <section className="flex flex-1 items-center justify-center px-4 py-20">
        <Card className="mx-auto max-w-md text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Welcome to Pro!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your subscription is now active. Enjoy unlimited job results, advanced filters, and
              priority support.
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
