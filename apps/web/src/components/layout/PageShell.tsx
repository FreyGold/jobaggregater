import * as React from 'react';

import { Container } from '@/components/layout/Container';
import { cn } from '@/lib/utils';

export function PageShell({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Container className={cn('py-8 flex-1', className)} {...props} />;
}
