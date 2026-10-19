import { createECDH, createPublicKey, createDecipheriv, hkdfSync, randomBytes, randomUUID, verify } from 'node:crypto';
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { HOST } from './env.ts';

/*
 * A stand-in for the push services of Google, Mozilla and Apple. The backend of the e2e run
 * accepts push endpoints on the loopback address over plain HTTP (bootTestRun), so the tests give it
 * subscriptions that point here. Each subscription has a real P-256 key pair and authentication
 * secret, as a browser's has: the backend encrypts for them (RFC 8291) and the tests decrypt with the
 * private key, independently of the backend's code, and check the VAPID token (RFC 8292).
 */

const base64Url = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64url');

/** The keys a browser hands out with a push subscription, plus the private key it keeps. */
export interface SubscriptionKeys {
  /** Uncompressed P-256 public key, URL-safe Base64 (65 bytes). */
  p256dh: string;
  /** Authentication secret, URL-safe Base64 (16 bytes). */
  auth: string;
  /** Private key of p256dh; never leaves the test. */
  privateKey: Buffer;
}

export function newSubscriptionKeys(): SubscriptionKeys {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return {
    p256dh: base64Url(ecdh.getPublicKey()),
    auth: base64Url(randomBytes(16)),
    privateKey: ecdh.getPrivateKey(),
  };
}

/** PushSubscription.toJSON() of a browser, as POST /api/push/subscriptions takes it. */
export interface SubscriptionJson {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** A subscription at the stub push service with the keys to read its messages. */
export interface StubSubscription {
  json: SubscriptionJson;
  keys: SubscriptionKeys;
}

/** How the stub push service answers a message, as a real one may. */
export type PushServiceAnswer =
  /** 201 Created: accepted for delivery. */
  | 'accept'
  /** 410 Gone: the browser has dropped the subscription. */
  | 'gone'
  /** 500: the push service is in trouble; the subscription stays. */
  | 'fail';

const STATUS: Record<PushServiceAnswer, number> = { accept: 201, gone: 410, fail: 500 };

/** A push message as the backend sent it. */
export interface PushMessage {
  /** The subscription it was sent to. */
  endpoint: string;
  headers: IncomingHttpHeaders;
  body: Buffer;
  receivedAt: number;
}

interface Waiter {
  endpoint: string;
  count: number;
  resolve: (messages: PushMessage[]) => void;
}

export class StubPushService {
  /** E.g. http://127.0.0.1:53124, the audience of the backend's VAPID tokens. */
  readonly origin: string;
  private readonly server: Server;
  private readonly messages: PushMessage[] = [];
  private readonly answers = new Map<string, PushServiceAnswer>();
  private waiters: Waiter[] = [];

  private constructor(server: Server, origin: string) {
    this.server = server;
    this.origin = origin;
  }

  /** Listens on a free port of the loopback address; close it at the end of the test. */
  static async start(): Promise<StubPushService> {
    let service: StubPushService | undefined;
    const server = createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer) => chunks.push(chunk));
      request.on('end', () => {
        const endpoint = `${service?.origin}${request.url}`;
        const answer = service?.answers.get(endpoint) ?? 'accept';
        response.writeHead(STATUS[answer], { 'Content-Type': 'text/plain' });
        response.end(answer === 'accept' ? '' : `stub push service: ${answer}`);
        service?.record({ endpoint, headers: request.headers, body: Buffer.concat(chunks), receivedAt: Date.now() });
      });
    });
    await new Promise<void>((resolve) => server.listen(0, HOST, resolve));
    const { port } = server.address() as AddressInfo;
    service = new StubPushService(server, `http://${HOST}:${port}`);
    return service;
  }

  /** A new subscription of a browser at this push service, answering as `answer` says. */
  subscribe(answer: PushServiceAnswer = 'accept'): StubSubscription {
    const keys = newSubscriptionKeys();
    const endpoint = `${this.origin}/push/${randomUUID()}`;
    this.answers.set(endpoint, answer);
    return { json: { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } }, keys };
  }

  /** The messages sent to the endpoint so far. */
  messagesTo(endpoint: string): PushMessage[] {
    return this.messages.filter((message) => message.endpoint === endpoint);
  }

  /** Resolves once `count` messages have reached the endpoint, at most `timeout` ms later. */
  waitForMessages(endpoint: string, count = 1, timeout = 20_000): Promise<PushMessage[]> {
    const received = this.messagesTo(endpoint);
    if (received.length >= count) return Promise.resolve(received);
    return new Promise((resolve, reject) => {
      const waiter: Waiter = { endpoint, count, resolve };
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((other) => other !== waiter);
        reject(new Error(`${this.messagesTo(endpoint).length} of ${count} push messages reached ${endpoint} within ${timeout} ms`));
      }, timeout);
      waiter.resolve = (messages) => {
        clearTimeout(timer);
        resolve(messages);
      };
      this.waiters.push(waiter);
    });
  }

  async waitForMessage(endpoint: string, timeout?: number): Promise<PushMessage> {
    const messages = await this.waitForMessages(endpoint, 1, timeout);
    return messages[0] as PushMessage;
  }

  close(): Promise<void> {
    return new Promise((resolve) => this.server.close(() => resolve()));
  }

  private record(message: PushMessage): void {
    this.messages.push(message);
    const due = this.waiters.filter((waiter) => this.messagesTo(waiter.endpoint).length >= waiter.count);
    this.waiters = this.waiters.filter((waiter) => !due.includes(waiter));
    for (const waiter of due) waiter.resolve(this.messagesTo(waiter.endpoint));
  }
}

const KEY_INFO = Buffer.from('WebPush: info\0', 'ascii');
const CEK_INFO = Buffer.from('Content-Encoding: aes128gcm\0', 'ascii');
const NONCE_INFO = Buffer.from('Content-Encoding: nonce\0', 'ascii');
const TAG_LENGTH = 16;
const LAST_RECORD_DELIMITER = 0x02;

const hkdf = (salt: Buffer, key: Buffer, info: Buffer, length: number): Buffer =>
  Buffer.from(hkdfSync('sha256', key, salt, info, length));

/** The parts of an `aes128gcm` body (RFC 8188 section 2.1). */
export interface EncryptedContent {
  salt: Buffer;
  recordSize: number;
  /** The key id: the application server's ephemeral public key in web push (RFC 8291 section 4). */
  serverPublicKey: Buffer;
  ciphertext: Buffer;
}

export function parseEncryptedContent(body: Buffer): EncryptedContent {
  const keyLength = body.readUInt8(20);
  return {
    salt: body.subarray(0, 16),
    recordSize: body.readUInt32BE(16),
    serverPublicKey: body.subarray(21, 21 + keyLength),
    ciphertext: body.subarray(21 + keyLength),
  };
}

/** Decrypts a web push message for the subscription (RFC 8291 section 3.4, single record). */
export function decryptPushMessage(body: Buffer, keys: SubscriptionKeys): string {
  const { salt, serverPublicKey, ciphertext } = parseEncryptedContent(body);
  const ecdh = createECDH('prime256v1');
  ecdh.setPrivateKey(keys.privateKey);
  const sharedSecret = ecdh.computeSecret(serverPublicKey);
  const userAgentKey = Buffer.from(keys.p256dh, 'base64url');
  const inputKey = hkdf(
    Buffer.from(keys.auth, 'base64url'),
    sharedSecret,
    Buffer.concat([KEY_INFO, userAgentKey, serverPublicKey]),
    32,
  );
  const decipher = createDecipheriv('aes-128-gcm', hkdf(salt, inputKey, CEK_INFO, 16), hkdf(salt, inputKey, NONCE_INFO, 12));
  decipher.setAuthTag(ciphertext.subarray(ciphertext.length - TAG_LENGTH));
  const record = Buffer.concat([decipher.update(ciphertext.subarray(0, ciphertext.length - TAG_LENGTH)), decipher.final()]);
  let end = record.length - 1;
  while (end >= 0 && record[end] === 0) end -= 1;
  if (record[end] !== LAST_RECORD_DELIMITER) throw new Error('The record has no padding delimiter of a last record');
  return record.subarray(0, end).toString('utf8');
}

/** The VAPID token of a push message (RFC 8292): header, claims and whether its signature is valid. */
export interface VapidToken {
  header: { typ?: string; alg: string };
  claims: { aud: string; exp: number; sub: string };
  /** The application server key the token is signed with (`k`), URL-safe Base64. */
  publicKey: string;
  signatureValid: boolean;
}

const VAPID_SCHEME = /^vapid t=([\w-]+\.[\w-]+\.[\w-]+), k=([\w-]+)$/;

/** Reads `Authorization: vapid t=…, k=…` and verifies the ES256 signature with `k`. */
export function readVapidToken(authorization: string | undefined): VapidToken {
  const match = VAPID_SCHEME.exec(authorization ?? '');
  if (!match) throw new Error(`Not a VAPID authorization: ${authorization}`);
  const [, token = '', publicKey = ''] = match;
  const [header = '', claims = '', signature = ''] = token.split('.');
  const point = Buffer.from(publicKey, 'base64url');
  const key = createPublicKey({
    key: { kty: 'EC', crv: 'P-256', x: base64Url(point.subarray(1, 33)), y: base64Url(point.subarray(33, 65)) },
    format: 'jwk',
  });
  const signatureValid = verify(
    'sha256',
    Buffer.from(`${header}.${claims}`, 'ascii'),
    { key, dsaEncoding: 'ieee-p1363' },
    Buffer.from(signature, 'base64url'),
  );
  const json = (part: string): unknown => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  return {
    header: json(header) as VapidToken['header'],
    claims: json(claims) as VapidToken['claims'],
    publicKey,
    signatureValid,
  };
}
