/*
 * The push subscription as the backend stores it, shared by the page (opt-in) and the worker
 * (renewal). The VAPID public key comes base64url-encoded from the backend.
 */

export interface SubscriptionKeys {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export function subscriptionKeys(subscription: PushSubscription): SubscriptionKeys {
  const { endpoint, keys } = subscription.toJSON();
  const p256dh = keys?.p256dh;
  const auth = keys?.auth;
  if (!endpoint || !p256dh || !auth) throw new Error('The push subscription has no keys');
  return { endpoint, keys: { p256dh, auth } };
}

export function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** Whether a subscription was made with this key; a new key on the server needs a new one. */
export function hasServerKey(subscription: PushSubscription, key: Uint8Array): boolean {
  const own = subscription.options.applicationServerKey;
  if (own?.byteLength !== key.byteLength) return false;
  const bytes = new Uint8Array(own);
  return bytes.every((byte, index) => byte === key[index]);
}

type Candidates = readonly (readonly [name: string, pattern: RegExp])[];

// Order matters: Edge and Samsung Internet also call themselves Chrome, Chrome calls itself Safari.
const BROWSERS: Candidates = [
  ['Edge', /Edg(A|iOS)?\//],
  ['Samsung Internet', /SamsungBrowser\//],
  ['Firefox', /Firefox\/|FxiOS\//],
  ['Chrome', /Chrome\/|CriOS\//],
  ['Safari', /Safari\//],
];

const SYSTEMS: Candidates = [
  ['iPhone', /iPhone/],
  ['iPad', /iPad/],
  ['Android', /Android/],
  ['Windows', /Windows/],
  ['macOS', /Macintosh/],
  ['Linux', /Linux/],
];

const firstMatch = (candidates: Candidates, userAgent: string, fallback: string) =>
  candidates.find(([, pattern]) => pattern.test(userAgent))?.[0] ?? fallback;

/** A short name of the device for the backend's list, e.g. "Chrome · Android". */
export function deviceLabel(userAgent: string): string {
  return `${firstMatch(BROWSERS, userAgent, 'Browser')} · ${firstMatch(SYSTEMS, userAgent, 'Gerät')}`;
}
