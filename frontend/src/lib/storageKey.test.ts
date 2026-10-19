import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { storageKey } from './storageKey';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('storageKey', () => {
  it('names the key with the Lumastar prefix', () => {
    expect(storageKey('reminder-nudge')).toBe('lumastar:reminder-nudge');
  });

  it('moves a value stored before the rename to the new key once', () => {
    localStorage.setItem('lingora:device-preferences', '{"state":{"sound":false},"version":1}');

    storageKey('device-preferences');

    expect(localStorage.getItem('lumastar:device-preferences')).toBe(
      '{"state":{"sound":false},"version":1}',
    );
    expect(localStorage.getItem('lingora:device-preferences')).toBeNull();
  });

  it('keeps a value already stored under the new key and drops the old one', () => {
    localStorage.setItem('lingora:push-owner', 'old-owner');
    localStorage.setItem('lumastar:push-owner', 'new-owner');

    storageKey('push-owner');

    expect(localStorage.getItem('lumastar:push-owner')).toBe('new-owner');
    expect(localStorage.getItem('lingora:push-owner')).toBeNull();
  });

  it('leaves the storage alone without an old value', () => {
    storageKey('shown-streak-trophies');

    expect(localStorage).toHaveLength(0);
  });

  it('keeps the old value when the new key cannot be written', () => {
    localStorage.setItem('lingora:reminder-nudge', '{"state":{"state":"done"},"version":1}');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });

    expect(storageKey('reminder-nudge')).toBe('lumastar:reminder-nudge');

    expect(localStorage.getItem('lingora:reminder-nudge')).toBe(
      '{"state":{"state":"done"},"version":1}',
    );
  });

  it('still names the key when the browser blocks localStorage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Access is denied.', 'SecurityError');
    });

    expect(storageKey('device-preferences')).toBe('lumastar:device-preferences');
  });
});
