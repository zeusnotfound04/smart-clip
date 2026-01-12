'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

// Configure default options for all queries
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time - data is considered fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Cache time - unused data stays in cache for 10 minutes
        gcTime: 10 * 60 * 1000,
        // Retry failed requests 1 time
        retry: 1,
        // Refetch on window focus for critical data
        refetchOnWindowFocus: true,
        // Don't refetch on mount if data is still fresh
        refetchOnMount: false,
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  // have a suspense boundary between this and the code that may
  // suspend because React will throw away the client on the initial
  // render if it suspends and there is no boundary
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
