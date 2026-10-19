import { randomUUID } from 'node:crypto';
import { expect, type APIRequest, type APIRequestContext } from '@playwright/test';
import { csrfHeaders } from './csrf.ts';
import { FRONTEND_URL, RUN_ID } from './env.ts';
import { ONBOARDING } from './learner.ts';
import { Inbox, linkIn, SUBJECTS } from './mailpit.ts';
import type { PlacementResult } from './placementApi.ts';

/* Accounts through the API: what the tests need besides the screens they are about. */

export type RegistrationMode = 'open' | 'invite' | 'closed';

export interface AuthStatus {
  authenticated: boolean;
  registrationMode: RegistrationMode;
  legacyLoginAvailable: boolean;
  displayName?: string;
  emailVerified?: boolean;
}

/** GET /api/account. */
export interface AccountInfo {
  email?: string;
  emailVerified: boolean;
  pendingEmail?: string;
  displayName: string;
  createdAt: string;
}

export interface Credentials {
  displayName: string;
  email: string;
  password: string;
}

/** Reads GET /api/auth/status through the frontend proxy. */
export async function fetchAuthStatus(request: APIRequestContext): Promise<AuthStatus> {
  const response = await request.get('/api/auth/status');
  expect(response.status()).toBe(200);
  return (await response.json()) as AuthStatus;
}

export async function fetchAccount(request: APIRequestContext): Promise<AccountInfo> {
  const response = await request.get('/api/account');
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()) as AccountInfo;
}

/**
 * A new account of this run that no other test uses: the address names the run and the purpose, the
 * random part keeps the two phone projects (and retries) apart.
 */
export function newCredentials(purpose: string, displayName = 'Arta'): Credentials {
  return {
    displayName,
    email: `e2e-${RUN_ID}-${purpose}-${randomUUID().slice(0, 8)}@lumastar.test`,
    password: `pw-${randomUUID()}`,
  };
}

/** POST /api/auth/register: creates the account and signs the context in. */
export async function registerViaApi(request: APIRequestContext, account: Credentials): Promise<void> {
  const response = await request.post('/api/auth/register', {
    headers: await csrfHeaders(request),
    data: { displayName: account.displayName, email: account.email, password: account.password },
  });
  expect(response.status(), await response.text()).toBe(201);
}

/** POST /api/auth/login; returns the status, 204 when signed in. */
export async function loginViaApi(
  request: APIRequestContext,
  credentials: Pick<Credentials, 'email' | 'password'>,
): Promise<number> {
  const response = await request.post('/api/auth/login', {
    headers: await csrfHeaders(request),
    data: { email: credentials.email, password: credentials.password },
  });
  return response.status();
}

/** The token of a link from an account mail. */
export function tokenOf(link: string): string {
  const token = new URL(link).searchParams.get('token');
  if (!token) throw new Error(`No token in ${link}`);
  return token;
}

/** POST /api/auth/verify-email with the token of a mailed link; returns the status, 204 when confirmed. */
export async function verifyViaApi(request: APIRequestContext, link: string): Promise<number> {
  const response = await request.post('/api/auth/verify-email', {
    headers: await csrfHeaders(request),
    data: { token: tokenOf(link) },
  });
  return response.status();
}

/** Confirms the address with the link of the next verification mail, for tests about what follows. */
export async function confirmAddressViaApi(request: APIRequestContext, inbox: Inbox): Promise<void> {
  const link = linkIn(await inbox.next(SUBJECTS.verify), '/verify-email');
  expect(await verifyViaApi(request, link)).toBe(204);
}

/**
 * An API client of its own, e.g. another device of a learner; the caller disposes of it. It starts
 * signed out: Playwright Test would give it the storage state of the project, i.e. the session of the
 * shared learner, and a sign-in on it would change that session's id and end it for the other tests.
 */
export function newApiContext(playwright: { request: APIRequest }): Promise<APIRequestContext> {
  return playwright.request.newContext({ baseURL: FRONTEND_URL, storageState: { cookies: [], origins: [] } });
}

/**
 * The onboarding of the setup project through the API: the same answers, then the placement test
 * skipped, so the learner starts at A0 with a plan and a path.
 */
export async function onboardViaApi(request: APIRequestContext): Promise<PlacementResult> {
  const headers = await csrfHeaders(request);
  const answered = await request.put('/api/onboarding', {
    headers,
    data: {
      motivations: ONBOARDING.motivations.map(({ value }) => value),
      dailyGoalMinutes: ONBOARDING.dailyGoal.minutes,
      selfAssessment: ONBOARDING.selfAssessment.value,
    },
  });
  expect(answered.status(), await answered.text()).toBe(200);
  const skipped = await request.post('/api/placement/skip', { headers });
  expect(skipped.status(), await skipped.text()).toBe(200);
  return (await skipped.json()) as PlacementResult;
}

export interface TestLearner {
  credentials: Credentials;
  inbox: Inbox;
  /** The skipped placement test of the onboarding. */
  placement: PlacementResult;
}

/** A new learner of this run, registered and onboarded through the API and signed in on `request`. */
export async function newLearnerViaApi(
  request: APIRequestContext,
  purpose: string,
  displayName?: string,
): Promise<TestLearner> {
  const credentials = newCredentials(purpose, displayName);
  await registerViaApi(request, credentials);
  const placement = await onboardViaApi(request);
  return { credentials, inbox: new Inbox(credentials.email), placement };
}
