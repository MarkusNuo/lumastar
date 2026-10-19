import { safeLocalStorage } from './safeLocalStorage';

const PREFIX = 'lumastar:';
// The keys from before the rename from Lingora to Lumastar, still on the devices.
const LEGACY_PREFIX = 'lingora:';

/**
 * The localStorage key of `name`. A value stored under the key from before the rename moves over
 * once, so device settings survive it. Called where the key is defined, so the move happens before
 * anything reads the key.
 */
export function storageKey(name: string): string {
  const key = `${PREFIX}${name}`;
  takeOverLegacyValue(`${LEGACY_PREFIX}${name}`, key);
  return key;
}

function takeOverLegacyValue(legacyKey: string, key: string): void {
  const legacy = safeLocalStorage.getItem(legacyKey);
  if (legacy === null) return;
  if (safeLocalStorage.getItem(key) === null) safeLocalStorage.setItem(key, legacy);
  // A value that could not be written (full quota) stays under the old key for the next start.
  if (safeLocalStorage.getItem(key) !== null) safeLocalStorage.removeItem(legacyKey);
}
