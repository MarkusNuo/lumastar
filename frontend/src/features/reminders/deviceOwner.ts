import { safeLocalStorage } from '../../lib/safeLocalStorage';
import { storageKey } from '../../lib/storageKey';

/*
 * Which learner this browser's push subscription was made for. The subscription belongs to the
 * browser, not to a session: a session that ends without signing out (expiry, a password change
 * elsewhere) leaves it behind, and whoever signs in next must not get it. Only a hash of the
 * address is stored, so a shared device does not show who used it before.
 */

export const DEVICE_OWNER_KEY = storageKey('push-owner');

async function learnerKey(email: string): Promise<string | undefined> {
  // Only secure contexts have it, and only they can receive web push.
  if (!(globalThis.crypto as Crypto | undefined)?.subtle) return undefined;
  const address = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', address));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Notes the learner whose subscription this browser holds now; without an address, nobody. */
export async function rememberDeviceOwner(email: string | undefined): Promise<void> {
  const key = email === undefined ? undefined : await learnerKey(email);
  if (key) safeLocalStorage.setItem(DEVICE_OWNER_KEY, key);
  else forgetDeviceOwner();
}

/** Whether this browser's subscription was made for the learner with this address. */
export async function isDeviceOwner(email: string | undefined): Promise<boolean> {
  const owner = safeLocalStorage.getItem(DEVICE_OWNER_KEY);
  if (owner === null || email === undefined) return false;
  return owner === (await learnerKey(email));
}

export function forgetDeviceOwner(): void {
  safeLocalStorage.removeItem(DEVICE_OWNER_KEY);
}
