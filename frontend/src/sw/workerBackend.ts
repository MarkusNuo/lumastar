import createClient from 'openapi-fetch';
import { csrfMiddleware, problemMiddleware, type CsrfTokenReader } from '../api/middleware';
import type { paths } from '../api/schema';
import type { WorkerBackend } from './handlers';
import { SNOOZE_MINUTES } from './reminder';
import { deviceLabel, subscriptionKeys } from './subscription';

export interface WorkerBackendOptions {
  baseUrl: string;
  fetch: (request: Request) => Promise<Response>;
  readCsrfToken: CsrfTokenReader;
  userAgent: string;
}

/**
 * The worker's own API client: the same generated paths and middleware as the page's client, but
 * the CSRF token comes from the Cookie Store (a worker has no `document.cookie`) and a 401 has no
 * page to sign out.
 */
export function createWorkerBackend({
  baseUrl,
  fetch,
  readCsrfToken,
  userAgent,
}: WorkerBackendOptions): WorkerBackend {
  const client = createClient<paths>({ baseUrl, fetch, credentials: 'include' });
  client.use(
    csrfMiddleware(readCsrfToken),
    problemMiddleware(() => undefined),
  );

  return {
    snooze: async (token) => {
      await client.POST('/api/reminders/snooze', { body: { token, minutes: SNOOZE_MINUTES } });
    },
    saveSubscription: async (subscription) => {
      await client.POST('/api/push/subscriptions', {
        body: { ...subscriptionKeys(subscription), label: deviceLabel(userAgent) },
      });
    },
    deleteSubscription: async (endpoint) => {
      await client.DELETE('/api/push/subscriptions', { body: { endpoint } });
    },
    publicKey: async () => {
      const { data } = await client.GET('/api/push/config');
      return data?.available ? data.publicKey : undefined;
    },
  };
}
