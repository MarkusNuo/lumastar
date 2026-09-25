import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import type { ProblemDetail } from '../api/types';

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function problemResponse(problem: Omit<ProblemDetail, 'title'>): Response {
  return new Response(JSON.stringify({ title: 'Problem', ...problem }), {
    status: problem.status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}

type Route = (request: Request) => Response | Promise<Response>;

/**
 * Replaces the global fetch the API client uses. Routes are keyed by "METHOD /path"; unknown
 * requests reject like a network failure. Returns the requests made so far.
 */
export function stubApi(routes: Record<string, Route>): Request[] {
  const requests: Request[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      requests.push(request);
      const key = `${request.method} ${new URL(request.url).pathname}`;
      const route = routes[key];
      if (!route) throw new Error(`Unexpected request ${key}`);
      return route(request);
    }),
  );
  return requests;
}

export function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  };
}
