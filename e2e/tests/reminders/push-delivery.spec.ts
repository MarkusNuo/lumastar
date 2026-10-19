import { expect, test, type APIRequestContext } from '@playwright/test';
import { newApiContext, newLearnerViaApi } from '../../support/auth.ts';
import { FRONTEND_URL } from '../../support/env.ts';
import {
  decryptPushMessage,
  parseEncryptedContent,
  readVapidToken,
  StubPushService,
  type PushMessage,
  type StubSubscription,
} from '../../support/pushService.ts';
import {
  expectProblem,
  fetchPushConfig,
  fetchPushDevices,
  sendTestPush,
  subscribeViaApi,
  unsubscribeViaApi,
  type PushDevice,
  type PushNotification,
  type PushTestResult,
} from '../../support/reminderApi.ts';

/*
 * The backend's web push (M9) against a stub push service on the loopback address: the e2e backend
 * (bootTestRun) has a throwaway VAPID key pair and accepts such endpoints over plain HTTP. The tests
 * decrypt each message with the subscription's private key (RFC 8291) and check the VAPID token
 * (RFC 8292) with Node's crypto, independently of the backend's own implementation.
 */

/** The test notification as the backend sends it (German, Swiss orthography). */
const TEST_NOTIFICATION: PushNotification = {
  kind: 'test',
  title: 'Erinnerungen sind bereit 🔔',
  body: 'So erinnert dich Lumastar an dein Tagesziel.',
  url: '/',
  tag: 'lumastar-test',
  renotify: true,
  icon: '/icons/icon-192.png',
  badge: '/icons/badge-96.png',
  actions: [],
};

/** RFC 8292: a VAPID token is valid for at most 24 hours. */
const MAX_TOKEN_SECONDS = 24 * 60 * 60;
/** The backend's defaults: devices per learner, failed deliveries in a row before a device goes. */
const MAX_DEVICES = 10;
const MAX_FAILURES = 5;

let pushService: StubPushService;
let api: APIRequestContext;

test.beforeEach(async ({ playwright }) => {
  pushService = await StubPushService.start();
  api = await newApiContext(playwright);
});

test.afterEach(async () => {
  await api.dispose();
  await pushService.close();
});

async function subscribe(request: APIRequestContext, subscription: StubSubscription, label?: string): Promise<PushDevice> {
  const response = await subscribeViaApi(request, subscription.json, label);
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()) as PushDevice;
}

async function sendTest(request: APIRequestContext): Promise<PushTestResult> {
  const response = await sendTestPush(request);
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()) as PushTestResult;
}

const onlyMessageTo = (subscription: StubSubscription): PushMessage => {
  const messages = pushService.messagesTo(subscription.json.endpoint);
  expect(messages, 'one push message, sent before the API answered').toHaveLength(1);
  return messages[0] as PushMessage;
};

test('the test notification reaches the push service encrypted for the device, with a signed VAPID token for its origin', async () => {
  await newLearnerViaApi(api, 'push-test');
  const config = await fetchPushConfig(api);
  expect(config.available, 'bootTestRun turns web push on').toBe(true);
  expect(config.publicKey, 'an uncompressed P-256 point, URL-safe Base64').toMatch(/^[\w-]{87}$/);

  const phone = pushService.subscribe();
  const device = await subscribe(api, phone, 'Chrome · Android');
  expect(device).toMatchObject({ endpoint: phone.json.endpoint, label: 'Chrome · Android', failureCount: 0 });
  expect(device.lastSuccessAt, 'nothing delivered yet').toBeUndefined();
  expect(await fetchPushDevices(api)).toEqual([device]);

  const sentAt = Math.floor(Date.now() / 1000);
  const result = await sendTest(api);
  expect(result).toMatchObject({ devices: 1, delivered: 1, removed: 0 });
  expect(result.notification).toEqual(TEST_NOTIFICATION);
  const message = onlyMessageTo(phone);

  await test.step('RFC 8030 headers: encrypted content, a time to live, urgency and the tag as topic', () => {
    expect(message.headers).toMatchObject({
      'content-encoding': 'aes128gcm',
      'content-type': 'application/octet-stream',
      ttl: '600',
      urgency: 'normal',
      topic: 'lumastar-test',
    });
  });

  await test.step('VAPID: an ES256 token for the push service origin, signed with the key browsers subscribe with', () => {
    const vapid = readVapidToken(message.headers.authorization);
    expect(vapid.header).toEqual({ typ: 'JWT', alg: 'ES256' });
    expect(vapid.publicKey).toBe(config.publicKey);
    expect(vapid.signatureValid, 'the signature verifies with k').toBe(true);
    expect(vapid.claims.aud).toBe(pushService.origin);
    expect(vapid.claims.sub, 'the contact of the instance (LUMASTAR_PUBLIC_URL of the e2e run)').toBe(FRONTEND_URL);
    expect(vapid.claims.exp).toBeGreaterThan(sentAt);
    expect(vapid.claims.exp).toBeLessThanOrEqual(sentAt + MAX_TOKEN_SECONDS + 5);
  });

  await test.step('RFC 8291: one aes128gcm record for the device keys that only they decrypt', () => {
    const content = parseEncryptedContent(message.body);
    expect(content.recordSize).toBe(4096);
    expect(content.serverPublicKey).toHaveLength(65);
    expect(content.serverPublicKey[0], 'an uncompressed point').toBe(0x04);
    expect(JSON.parse(decryptPushMessage(message.body, phone.keys))).toEqual(TEST_NOTIFICATION);
    const stranger = pushService.subscribe();
    expect(() => decryptPushMessage(message.body, stranger.keys), 'other keys fail the authentication tag').toThrow();
  });

  await test.step('the icon and the status-bar badge of the notification exist', async () => {
    for (const path of [TEST_NOTIFICATION.icon, TEST_NOTIFICATION.badge]) {
      const image = await api.get(path);
      expect(image.status(), path).toBe(200);
      expect(image.headers()['content-type'], path).toBe('image/png');
    }
  });

  await test.step('the device records the delivery; every message has its own salt and server key', async () => {
    const [delivered] = await fetchPushDevices(api);
    expect(delivered?.lastSuccessAt).toBeDefined();
    expect(delivered?.failureCount).toBe(0);
    await sendTest(api);
    const [first, second] = pushService.messagesTo(phone.json.endpoint).map((sent) => parseEncryptedContent(sent.body));
    expect(second?.salt.equals(first?.salt ?? Buffer.alloc(0))).toBe(false);
    expect(second?.serverPublicKey.equals(first?.serverPublicKey ?? Buffer.alloc(0))).toBe(false);
  });
});

test('a device the push service no longer knows is removed, a failing one is kept and counted; without devices there is no test', async () => {
  await newLearnerViaApi(api, 'push-cleanup');
  const working = pushService.subscribe('accept');
  const gone = pushService.subscribe('gone');
  const failing = pushService.subscribe('fail');
  for (const subscription of [working, gone, failing]) await subscribe(api, subscription);

  const result = await sendTest(api);

  expect(result).toMatchObject({ devices: 3, delivered: 1, removed: 1 });
  for (const subscription of [working, gone, failing]) onlyMessageTo(subscription);
  const devices = await fetchPushDevices(api);
  expect(devices.map((device) => device.endpoint).sort()).toEqual(
    [working.json.endpoint, failing.json.endpoint].sort(),
  );
  expect(devices.find((device) => device.endpoint === failing.json.endpoint)).toMatchObject({ failureCount: 1 });
  expect(devices.find((device) => device.endpoint === working.json.endpoint)).toMatchObject({ failureCount: 0 });

  await test.step('subscribing again starts the failure count afresh', async () => {
    expect(await subscribe(api, failing)).toMatchObject({ failureCount: 0 });
  });

  await test.step('removing a device is idempotent; with none left the test reminder has nowhere to go', async () => {
    for (const subscription of [working, failing, failing]) {
      expect((await unsubscribeViaApi(api, subscription.json.endpoint)).status()).toBe(204);
    }
    expect(await fetchPushDevices(api)).toEqual([]);
    await expectProblem(await sendTestPush(api), 409, 'no_push_devices');
  });
});

test('a device whose deliveries fail five times in a row is removed', async () => {
  await newLearnerViaApi(api, 'push-failures');
  const working = pushService.subscribe('accept');
  const failing = pushService.subscribe('fail');
  for (const subscription of [working, failing]) await subscribe(api, subscription);

  for (let failures = 1; failures < MAX_FAILURES; failures += 1) {
    expect(await sendTest(api)).toMatchObject({ devices: 2, delivered: 1, removed: 0 });
    const kept = (await fetchPushDevices(api)).find((device) => device.endpoint === failing.json.endpoint);
    expect(kept, `kept after ${failures} failures`).toMatchObject({ failureCount: failures });
  }

  expect(await sendTest(api)).toMatchObject({ devices: 2, delivered: 1, removed: 1 });
  expect(pushService.messagesTo(failing.json.endpoint)).toHaveLength(MAX_FAILURES);
  expect((await fetchPushDevices(api)).map((device) => device.endpoint)).toEqual([working.json.endpoint]);
});

test('a learner has at most ten devices: a new one replaces the one subscribed or reached the longest time ago', async () => {
  await newLearnerViaApi(api, 'push-cap');
  // The first device is the oldest, but the test notification reaches only it: it was seen last.
  const reached = pushService.subscribe('accept');
  await subscribe(api, reached);
  const silent = Array.from({ length: MAX_DEVICES - 1 }, () => pushService.subscribe('fail'));
  for (const subscription of silent) await subscribe(api, subscription);
  expect(await sendTest(api)).toMatchObject({ devices: MAX_DEVICES, delivered: 1, removed: 0 });

  const newest = pushService.subscribe();
  await subscribe(api, newest);

  const endpoints = (await fetchPushDevices(api)).map((device) => device.endpoint);
  expect(endpoints).toHaveLength(MAX_DEVICES);
  const [oldestSilent, ...otherSilent] = silent.map((subscription) => subscription.json.endpoint);
  expect(endpoints, 'the device not seen for the longest time is gone').not.toContain(oldestSilent);
  expect(endpoints.sort()).toEqual([reached.json.endpoint, newest.json.endpoint, ...otherSilent].sort());
});

test('subscriptions only to the endpoints of known push services, with valid keys (no request forgery)', async () => {
  await newLearnerViaApi(api, 'push-ssrf');
  const keys = pushService.subscribe().json.keys;
  const refused = [
    'https://push.example.com/send/abc',
    'https://fcm.googleapis.com.evil.test/fcm/send/abc',
    'https://user@fcm.googleapis.com/fcm/send/abc',
    'https://fcm.googleapis.com:8443/fcm/send/abc',
    'http://fcm.googleapis.com/fcm/send/abc',
    'http://169.254.169.254/latest/meta-data',
    'http://10.0.0.1:8080/push',
    'ftp://127.0.0.1/push',
    'not a url',
  ];
  for (const endpoint of refused) {
    await expectProblem(await subscribeViaApi(api, { endpoint, keys }), 400, 'push_service_not_supported');
  }

  await test.step('a browser subscription at Google, Mozilla, Apple or Microsoft is stored without sending anything', async () => {
    const endpoints = [
      'https://fcm.googleapis.com/fcm/send/e2e-device',
      'https://updates.push.services.mozilla.com/wpush/v2/e2e-device',
      'https://web.push.apple.com/e2e-device',
      'https://wns2-par02p.notify.windows.com/w/?token=e2e-device',
    ];
    for (const endpoint of endpoints) {
      const response = await subscribeViaApi(api, { endpoint, keys });
      expect(response.status(), `${endpoint}: ${await response.text()}`).toBe(200);
    }
    expect((await fetchPushDevices(api)).map((device) => device.endpoint)).toEqual(endpoints);
    for (const endpoint of endpoints) await unsubscribeViaApi(api, endpoint);
  });

  await test.step('keys must be a P-256 point and a 16-byte secret', async () => {
    const endpoint = pushService.subscribe().json.endpoint;
    const offCurve = Buffer.concat([Buffer.from([0x04]), Buffer.alloc(64, 1)]).toString('base64url');
    const shortSecret = Buffer.alloc(15, 7).toString('base64url');
    for (const invalid of [{ ...keys, p256dh: offCurve }, { ...keys, auth: shortSecret }]) {
      await expectProblem(await subscribeViaApi(api, { endpoint, keys: invalid }), 400, 'validation_failed');
    }
    expect(await fetchPushDevices(api)).toEqual([]);
  });
});

test('devices belong to their learner: another learner neither sees, removes nor reaches them', async ({ playwright }) => {
  await newLearnerViaApi(api, 'push-owner');
  const phone = pushService.subscribe();
  await subscribe(api, phone);
  const other = await newApiContext(playwright);
  try {
    await newLearnerViaApi(other, 'push-other');
    expect(await fetchPushDevices(other)).toEqual([]);
    expect((await unsubscribeViaApi(other, phone.json.endpoint)).status(), 'idempotent, nothing to remove').toBe(204);
    await expectProblem(await sendTestPush(other), 409, 'no_push_devices');
    expect((await fetchPushDevices(api)).map((device) => device.endpoint)).toEqual([phone.json.endpoint]);
    expect(pushService.messagesTo(phone.json.endpoint)).toEqual([]);
  } finally {
    await other.dispose();
  }

  await test.step('without a session the push endpoints answer 401', async () => {
    const signedOut = await newApiContext(playwright);
    try {
      for (const path of ['/api/push/config', '/api/push/subscriptions', '/api/reminders']) {
        expect((await signedOut.get(path)).status(), path).toBe(401);
      }
    } finally {
      await signedOut.dispose();
    }
  });
});
