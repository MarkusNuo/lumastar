/** Screens of the account settings (from the profile) and the e-mail step of a former account. */
export const ACCOUNT_ROUTES = {
  profile: '/profil',
  displayName: '/profil/name',
  email: '/profil/e-mail',
  password: '/profil/passwort',
  delete: '/profil/konto-loeschen',
  addEmail: '/e-mail-hinzufuegen',
} as const;

/** Where a signed-in learner has to go for the e-mail step, or undefined to stay. */
export function emailStepRedirect(emailRequired: boolean, pathname: string): string | undefined {
  const onStep = pathname === ACCOUNT_ROUTES.addEmail;
  if (emailRequired) return onStep ? undefined : ACCOUNT_ROUTES.addEmail;
  return onStep ? '/' : undefined;
}
