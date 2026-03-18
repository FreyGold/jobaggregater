// ─── Site Header ─────────────────────────────────────────────────

'use client';

import Link from 'next/link';
import { Search, Crown } from 'lucide-react';
import { buttonVariants, Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/providers/auth-provider';
import { useCurrentSubscription } from '@/hooks/use-subscription';

export function Header() {
  const { isAuthenticated, logout, user } = useAuth();
  const { data: currentSub } = useCurrentSubscription();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="mr-6 flex items-center gap-2">
          <div className="flex rounded-md bg-primary p-1.5 text-primary-foreground">
            <Search className="h-5 w-5" />
          </div>
          <span className="hidden text-base font-semibold tracking-tight text-foreground md:inline-block">
            JobAgg
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/jobs" className="text-foreground/60 transition-colors hover:text-foreground">
            Browse Jobs
          </Link>
          <Link
            href="/pricing"
            className="text-foreground/60 transition-colors hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            href="/about"
            className="text-foreground/60 transition-colors hover:text-foreground"
          >
            About
          </Link>
        </nav>

        <div className="ml-auto flex items-center space-x-4">
          <ThemeToggle />

          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-2 sm:flex">
                <span className="text-sm text-muted-foreground">
                  Hi, <span className="font-medium text-foreground">{user?.name || 'User'}</span>
                </span>
                {currentSub?.plan && currentSub.plan !== 'FREE' && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Crown className="h-3 w-3" />
                    {currentSub.plan}
                  </Badge>
                )}
              </div>
              <Link
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
                href="/bookmarks"
              >
                Bookmarks
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}>
                Log out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link className={buttonVariants({ variant: 'ghost', size: 'sm' })} href="/login">
                Log in
              </Link>
              <Link className={buttonVariants({ size: 'sm' })} href="/register">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
