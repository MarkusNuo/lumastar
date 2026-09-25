import type { ConfirmationError, DisplayNameError, PasswordError } from './setupRules';
import { DISPLAY_NAME_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './setupRules';

/** UI copy of the first-start setup (German, Swiss orthography). */
export const SETUP_COPY = {
  back: 'Zurück',
  progressLabel: 'Einrichtung',
  progressValue: (step: number, total: number) => `Schritt ${step} von ${total}`,
  welcome: {
    title: 'Willkommen bei Lingora!',
    text: 'Hier lernst du Gheg-Albanisch: spielerisch, in kleinen Schritten und in deinem Tempo.',
    duration: 'Die Einrichtung dauert keine Minute.',
    start: 'Los geht’s',
  },
  name: {
    question: 'Wie sollen wir dich nennen?',
    label: 'Dein Name',
    placeholder: 'Vorname oder Spitzname',
    hint: 'So begrüsst dich Lingora.',
    next: 'Weiter',
    errors: {
      required: 'Bitte gib einen Namen ein.',
      tooLong: `Höchstens ${DISPLAY_NAME_MAX_LENGTH} Zeichen, bitte.`,
    } satisfies Record<DisplayNameError, string>,
  },
  password: {
    question: (name: string) => `Freut mich, ${name}! Wähle jetzt ein Passwort.`,
    passwordLabel: 'Passwort',
    passwordHint: `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen. Du brauchst es bei jeder Anmeldung.`,
    confirmationLabel: 'Passwort wiederholen',
    submit: 'Konto erstellen',
    errors: {
      tooShort: `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen, bitte.`,
      tooLong: `Höchstens ${PASSWORD_MAX_LENGTH} Zeichen, bitte.`,
    } satisfies Record<PasswordError, string>,
    confirmationErrors: {
      required: 'Bitte wiederhole dein Passwort.',
      mismatch: 'Die Passwörter stimmen nicht überein.',
    } satisfies Record<ConfirmationError, string>,
  },
  failure: {
    accountExists:
      'Für diese Lingora-Instanz gibt es schon ein Konto. Du wirst gleich zur Anmeldung weitergeleitet.',
    invalid: 'Deine Angaben wurden nicht angenommen. Prüfe bitte Name und Passwort.',
    failed:
      'Das Konto konnte nicht erstellt werden. Prüfe deine Verbindung und versuch es nochmals.',
  },
} as const;
