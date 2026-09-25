/** UI copy of sign-in and sign-out (German, Swiss orthography). */
export const AUTH_COPY = {
  login: {
    title: 'Willkommen zurück!',
    text: 'Schön, dass du wieder da bist. Gib dein Passwort ein und lern gleich weiter.',
    passwordLabel: 'Passwort',
    submit: 'Anmelden',
    empty: 'Bitte gib dein Passwort ein.',
    wrongPassword: 'Das Passwort stimmt nicht. Versuch es nochmals.',
    // Static on purpose: the alert is announced once, the countdown ticks in the button.
    throttled: 'Zu viele Fehlversuche. Mach kurz Pause, dann kannst du es nochmals versuchen.',
    wait: (countdown: string) => `Warten (${countdown})`,
    failed: 'Die Anmeldung hat nicht geklappt. Prüfe deine Verbindung und versuch es nochmals.',
  },
} as const;
