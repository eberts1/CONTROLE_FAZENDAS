'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { ToasterProvider } from '@/components/ui/use-toast';
import { ThemeProvider } from './theme-provider';
import { FarmProvider } from '@/hooks/use-farm-context';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToasterProvider>
          <FarmProvider>{children}</FarmProvider>
        </ToasterProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
