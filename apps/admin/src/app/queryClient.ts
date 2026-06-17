import { QueryClient } from "@tanstack/react-query";

/**
 * Single, configured QueryClient for the admin app.
 *
 * Admin is an operator console: data is read far more than it changes, and
 * operators don't want a refetch storm every time they tab back. These defaults
 * keep the cache warm for 30s and avoid focus refetches; individual queries can
 * still override per-call.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
