import type { APIRequestContext } from '@playwright/test';

/* Spring Security's SPA CSRF pattern: unsafe requests echo the XSRF-TOKEN cookie in a header. */
const CSRF_COOKIE = 'XSRF-TOKEN';
const CSRF_HEADER = 'X-XSRF-TOKEN';

/**
 * The CSRF header for POST requests of an API context that shares the signed-in session. The
 * backend sets the cookie on every response, so a GET first makes sure the current token is there.
 */
export async function csrfHeaders(request: APIRequestContext): Promise<Record<string, string>> {
  await request.get('/api/auth/status');
  const { cookies } = await request.storageState();
  const token = cookies.find((cookie) => cookie.name === CSRF_COOKIE)?.value;
  if (!token) throw new Error(`The backend set no ${CSRF_COOKIE} cookie`);
  return { [CSRF_HEADER]: decodeURIComponent(token) };
}
