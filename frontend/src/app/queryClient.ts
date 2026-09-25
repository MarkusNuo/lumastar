import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '../api/ApiError';

const MAX_RETRIES = 2;

/** Retries network and server failures; a 4xx answer stays the same however often it is asked. */
function retryTransientFailures(failureCount: number, error: Error): boolean {
  return failureCount < MAX_RETRIES && (!isApiError(error) || error.isTransient);
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: retryTransientFailures, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

export const queryClient = createQueryClient();
