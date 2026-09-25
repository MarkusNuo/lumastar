import { vi } from 'vitest';

/**
 * Vitest's jsdom shim converts jsdom Blobs for Node's Request by reading an internal field that
 * jsdom 30 no longer has, and Node's FormData rejects jsdom Files, so multipart uploads fail in
 * tests. Upload tests therefore switch File, Blob and FormData to Node's own classes, which Node's
 * Request sends natively (as a browser would). The globals are restored after the test.
 */
export async function switchToNodeFileApi(): Promise<void> {
  // A variable, not a literal: the app's TypeScript setup deliberately has no Node types.
  const nodeBuffer = 'node:buffer';
  const buffer = (await import(/* @vite-ignore */ nodeBuffer)) as Pick<
    typeof globalThis,
    'Blob' | 'File'
  >;
  vi.stubGlobal('Blob', buffer.Blob);
  vi.stubGlobal('File', buffer.File);
  // Response is Node's in this environment, so the FormData it parses is Node's too.
  const probe = await new Response('probe=1', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }).formData();
  vi.stubGlobal('FormData', probe.constructor);
}
