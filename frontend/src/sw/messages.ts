/*
 * Messages between the service worker and the open app. A tapped reminder asks a running window
 * to show its screen instead of reloading it, so nothing in progress is lost.
 */

export const OPEN_SCREEN = 'lingora:open-screen';

export interface OpenScreenMessage {
  type: typeof OPEN_SCREEN;
  /** Path within the app, e.g. "/weiter". */
  path: string;
}

export function openScreenMessage(path: string): OpenScreenMessage {
  return { type: OPEN_SCREEN, path };
}

export function isOpenScreenMessage(data: unknown): data is OpenScreenMessage {
  if (typeof data !== 'object' || data === null) return false;
  const { type, path } = data as Record<string, unknown>;
  return type === OPEN_SCREEN && typeof path === 'string';
}
