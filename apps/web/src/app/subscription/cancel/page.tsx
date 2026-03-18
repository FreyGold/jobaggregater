// ─── Subscription Cancelled Page ─────────────────────────────────

'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function SubscriptionCancelPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <Header />

      <section className="flex flex-1 items-center justify-center px-4 py-20">
        <Card className="mx-auto max-w-md text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <XCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Checkout Cancelled</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              No worries — you weren&apos;t charged. You can upgrade anytime from the pricing page.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Link href="/pricing" className={buttonVariants()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Pricing
              </Link>
              <Link href="/jobs" className={buttonVariants({ variant: 'outline' })}>
                Continue Browsing
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <Footer />
    </main>
  );
}
