import { expect, type APIRequestContext } from '@playwright/test';

export interface AuthStatus {
  authenticated: boolean;
  setupRequired: boolean;
  displayName?: string;
}

/** Reads GET /api/auth/status through the frontend proxy. */
export async function fetchAuthStatus(request: APIRequestContext): Promise<AuthStatus> {
  const response = await request.get('/api/auth/status');
  expect(response.status()).toBe(200);
  return (await response.json()) as AuthStatus;
}
