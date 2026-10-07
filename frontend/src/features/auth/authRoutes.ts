import type { AuthStatus } from './interimApi';

/** Routes of the signed-out area; the two token links are the paths the backend's mails use. */
export const AUTH_ROUTES = {
  welcome: '/willkommen',
  register: '/registrieren',
  login: '/anmelden',
  legacyLogin: '/anmelden/frueheres-konto',
  forgotPassword: '/passwort-vergessen',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',
} as const;

/** The two parts of the app; each one is only reachable in its matching auth state. */
export type AuthArea = 'signedOut' | 'signedIn';

export const AREA_ENTRY: Record<AuthArea, string> = {
  signedOut: AUTH_ROUTES.welcome,
  signedIn: '/',
};

export function areaFor(status: AuthStatus): AuthArea {
  return status.authenticated ? 'signedIn' : 'signedOut';
}

/** Where to send the user when `area` does not match the auth state, or undefined to stay. */
export function authRedirect(status: AuthStatus, area: AuthArea): string | undefined {
  const required = areaFor(status);
  return required === area ? undefined : AREA_ENTRY[required];
}
