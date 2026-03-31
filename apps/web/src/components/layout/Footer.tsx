// ─── Footer ──────────────────────────────────────────────────────

import Link from 'next/link';
import { Briefcase } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold tracking-tight text-foreground">JobAgg</span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/jobs" className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 rounded-sm">
              Browse Jobs
            </Link>
            <Link href="/about" className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 rounded-sm">
              About
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 rounded-sm">
              Privacy
            </Link>
          </nav>

          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} JobAgg.</p>
        </div>
      </div>
    </footer>
  );
}
