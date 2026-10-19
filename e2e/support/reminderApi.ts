import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { csrfHeaders } from './csrf.ts';
import type { SubscriptionJson } from './pushService.ts';

/* Web push and reminders through the API: /api/push/… and /api/reminders. */

/** GET /api/push/config. */
export interface PushConfig {
  available: boolean;
  /** VAPID public key, URL-safe Base64. */
  publicKey?: string;
}

/** An entry of GET /api/push/subscriptions. */
export interface PushDevice {
  endpoint: string;
  label?: string;
  createdAt: string;
  lastSuccessAt?: string;
  failureCount: number;
}

export type NotificationKind = 'daily_reminder' | 'streak_at_risk' | 'test';

export interface NotificationAction {
  action: 'practise' | 'snooze';
  title: string;
}

/** The JSON payload of a push message, as the service worker shows it. */
export interface PushNotification {
  kind: NotificationKind;
  title: string;
  body: string;
  url: string;
  tag: string;
  renotify: boolean;
  icon: string;
  badge: string;
  actions: NotificationAction[];
  badgeCount?: number;
  snoozeToken?: string;
}

/** POST /api/push/test. */
export interface PushTestResult {
  devices: number;
  delivered: number;
  removed: number;
  notification: PushNotification;
}

/** GET and PUT /api/reminders; times are HH:mm in the learner's time zone. */
export interface ReminderSettings {
  enabled: boolean;
  time: string;
  rescueEnabled: boolean;
  rescueTime: string;
}

/** The settings of a learner who never switched reminders on. */
export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: false,
  time: '19:00',
  rescueEnabled: true,
  rescueTime: '21:30',
};

async function json<T>(response: APIResponse, status = 200): Promise<T> {
  expect(response.status(), `${response.url()}: ${await response.text()}`).toBe(status);
  return (await response.json()) as T;
}

export async function fetchPushConfig(request: APIRequestContext): Promise<PushConfig> {
  return json<PushConfig>(await request.get('/api/push/config'));
}

export async function fetchPushDevices(request: APIRequestContext): Promise<PushDevice[]> {
  return json<PushDevice[]>(await request.get('/api/push/subscriptions'));
}

/** POST /api/push/subscriptions as the app sends it after pushManager.subscribe(). */
export async function subscribeViaApi(
  request: APIRequestContext,
  subscription: SubscriptionJson,
  label?: string,
): Promise<APIResponse> {
  return request.post('/api/push/subscriptions', {
    headers: await csrfHeaders(request),
    data: { ...subscription, ...(label === undefined ? {} : { label }) },
  });
}

export async function unsubscribeViaApi(request: APIRequestContext, endpoint: string): Promise<APIResponse> {
  return request.delete('/api/push/subscriptions', { headers: await csrfHeaders(request), data: { endpoint } });
}

export async function sendTestPush(request: APIRequestContext): Promise<APIResponse> {
  return request.post('/api/push/test', { headers: await csrfHeaders(request) });
}

export async function fetchReminders(request: APIRequestContext): Promise<ReminderSettings> {
  return json<ReminderSettings>(await request.get('/api/reminders'));
}

export async function saveReminders(request: APIRequestContext, settings: ReminderSettings): Promise<APIResponse> {
  return request.put('/api/reminders', { headers: await csrfHeaders(request), data: settings });
}

/**
 * POST /api/reminders/snooze as the service worker sends it: neither session nor CSRF header, only
 * the token of the notification.
 */
export async function snoozeViaApi(
  request: APIRequestContext,
  token: string,
  minutes?: number,
): Promise<APIResponse> {
  return request.post('/api/reminders/snooze', { data: { token, ...(minutes === undefined ? {} : { minutes }) } });
}

/** A problem response (RFC 9457) with the given status and code. */
export async function expectProblem(response: APIResponse, status: number, code: string): Promise<void> {
  expect(response.status(), await response.text()).toBe(status);
  expect(response.headers()['content-type']).toMatch(/^application\/problem\+json/);
  expect(await response.json()).toMatchObject({ code });
}
