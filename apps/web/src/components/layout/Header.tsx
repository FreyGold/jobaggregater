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
        <Link href="/" className="flex items-center gap-2 mr-6">
          <div className="flex bg-primary text-primary-foreground p-1.5 rounded-md">
            <Search className="h-5 w-5" />
          </div>
          <span className="font-bold text-xl tracking-tight hidden md:inline-block">JobAgg</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/jobs" className="transition-colors hover:text-foreground/80 text-foreground/60">
            Browse Jobs
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-foreground/80 text-foreground/60">
            Pricing
          </Link>
          <Link href="/about" className="transition-colors hover:text-foreground/80 text-foreground/60">
            About
          </Link>
        </nav>

        <div className="ml-auto flex items-center space-x-4">
          <ThemeToggle />
          
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm font-medium">Hi, {user?.name || 'User'}</span>
                {currentSub?.plan && currentSub.plan !== 'FREE' && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Crown className="h-3 w-3" />
                    {currentSub.plan}
                  </Badge>
                )}
              </div>
              <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} href="/bookmarks">
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
