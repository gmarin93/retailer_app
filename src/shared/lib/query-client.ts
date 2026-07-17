import { isServer, QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/services/api/errors";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Reference data policy; operational queries override with staleTime: 0.
        staleTime: 60_000,
        // Never retry client errors; retry transient failures twice.
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Server: a fresh client per request (no shared cache between users).
 * Browser: a singleton, so the session store can clear it on logout.
 */
export function getQueryClient(): QueryClient {
  if (isServer) {
    return makeQueryClient();
  }
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
