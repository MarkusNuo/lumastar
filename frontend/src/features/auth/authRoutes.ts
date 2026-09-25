import type { AuthStatus } from '../../api/types';

/** The three parts of the app; each one is only reachable in its matching auth state. */
export type AuthArea = 'setup' | 'signedOut' | 'signedIn';

export const AREA_ENTRY: Record<AuthArea, string> = {
  setup: '/setup',
  signedOut: '/login',
  signedIn: '/',
};

export function areaFor(status: AuthStatus): AuthArea {
  if (status.authenticated) return 'signedIn';
  return status.setupRequired ? 'setup' : 'signedOut';
}

/** Where to send the user when `area` does not match the auth state, or undefined to stay. */
export function authRedirect(status: AuthStatus, area: AuthArea): string | undefined {
  const required = areaFor(status);
  return required === area ? undefined : AREA_ENTRY[required];
}
