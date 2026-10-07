import { describe, expect, it } from 'vitest';
import { fakePushSubscription } from '../test/fakeServiceWorker';
import { decodeBase64Url, deviceLabel, hasServerKey, subscriptionKeys } from './subscription';

describe('decodeBase64Url', () => {
  it('decodes URL-safe Base64 without padding, as VAPID keys come', () => {
    expect(decodeBase64Url('-_8')).toEqual(new Uint8Array([0xfb, 0xff]));
    expect(decodeBase64Url('BAEC')).toEqual(new Uint8Array([4, 1, 2]));
  });
});

describe('hasServerKey', () => {
  it('compares the key a subscription was made with', () => {
    const subscription = fakePushSubscription('https://push.example/1', [4, 1, 2]);

    expect(hasServerKey(subscription, new Uint8Array([4, 1, 2]))).toBe(true);
    expect(hasServerKey(subscription, new Uint8Array([4, 1, 3]))).toBe(false);
    expect(hasServerKey(subscription, new Uint8Array([4, 1]))).toBe(false);
  });

  it('treats a subscription without a known key as made with another', () => {
    const subscription = fakePushSubscription('https://push.example/1', null);

    expect(hasServerKey(subscription, new Uint8Array([4, 1, 2]))).toBe(false);
  });
});

describe('subscriptionKeys', () => {
  it('takes endpoint and keys from the JSON form', () => {
    expect(subscriptionKeys(fakePushSubscription('https://push.example/1'))).toEqual({
      endpoint: 'https://push.example/1',
      keys: { p256dh: 'p256dh-of-https://push.example/1', auth: 'auth-secret' },
    });
  });
});

describe('deviceLabel', () => {
  it.each([
    [
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36',
      'Chrome · Android',
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      'Safari · iPhone',
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Edg/129.0',
      'Edge · Windows',
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:131.0) Gecko/20100101 Firefox/131.0',
      'Firefox · macOS',
    ],
    ['curl/8.0', 'Browser · Gerät'],
  ])('names %s', (userAgent, label) => {
    expect(deviceLabel(userAgent)).toBe(label);
  });
});
