import type {
  ConfirmationError,
  DisplayNameError,
  EmailError,
  PasswordError,
} from './accountRules';
import { DISPLAY_NAME_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './accountRules';

const CONNECTION = 'Prüfe deine Verbindung und versuch es nochmals.';
const THROTTLED = 'Zu viele Versuche in kurzer Zeit. Mach kurz Pause, dann geht es weiter.';

/** Labels and messages of the account fields, shared by every form that asks for them. */
export const FIELD_COPY = {
  displayName: {
    label: 'Dein Name',
    placeholder: 'Vorname oder Spitzname',
    hint: 'So begrüsst dich Lingora.',
    errors: {
      required: 'Bitte gib einen Namen ein.',
      tooLong: `Höchstens ${DISPLAY_NAME_MAX_LENGTH} Zeichen, bitte.`,
    } satisfies Record<DisplayNameError, string>,
  },
  email: {
    label: 'E-Mail-Adresse',
    placeholder: 'name@beispiel.ch',
    errors: {
      required: 'Bitte gib deine E-Mail-Adresse ein.',
      invalid: 'Diese E-Mail-Adresse sieht nicht vollständig aus.',
      tooLong: 'Diese E-Mail-Adresse ist zu lang.',
    } satisfies Record<EmailError, string>,
  },
  newPassword: {
    label: 'Passwort',
    hint: `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`,
    errors: {
      required: 'Bitte wähle ein Passwort.',
      tooShort: `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen, bitte.`,
      tooLong: `Höchstens ${PASSWORD_MAX_LENGTH} Zeichen, bitte.`,
    } satisfies Record<PasswordError, string>,
  },
  confirmation: {
    label: 'Passwort wiederholen',
    errors: {
      required: 'Bitte wiederhole dein Passwort.',
      mismatch: 'Die Passwörter stimmen nicht überein.',
    } satisfies Record<ConfirmationError, string>,
  },
  currentPassword: {
    label: 'Passwort',
    required: 'Bitte gib dein Passwort ein.',
    wrong: 'Das Passwort stimmt nicht. Versuch es nochmals.',
  },
} as const;

/** UI copy of the signed-out area (German, Swiss orthography). */
export const AUTH_COPY = {
  back: 'Zurück',
  /** The server refused the input, but not for a field the form shows. */
  invalid: 'Deine Angaben wurden nicht angenommen. Prüfe sie bitte.',
  throttledWait: (countdown: string) => `Warten (${countdown})`,
  welcome: {
    title: 'Willkommen bei Lingora!',
    text: 'Hier lernst du Gheg-Albanisch: spielerisch, in kleinen Schritten und in deinem Tempo.',
    register: 'Konto erstellen',
    login: 'Ich habe schon ein Konto',
    closed: 'Neue Konten sind im Moment nicht möglich.',
  },
  register: {
    title: 'Erstelle dein Konto. Danach geht’s los!',
    inviteCode: {
      label: 'Einladungscode',
      hint: 'Neue Konten gibt es im Moment nur mit Einladung.',
      required: 'Bitte gib deinen Einladungscode ein.',
      invalid: 'Dieser Einladungscode stimmt nicht. Prüfe ihn bitte.',
    },
    submit: 'Konto erstellen',
    haveAccount: 'Schon ein Konto?',
    login: 'Anmelden',
    emailTaken:
      'Mit dieser E-Mail-Adresse gibt es schon ein Konto. Melde dich an oder setze dein Passwort zurück.',
    refused: {
      displayName: 'Dieser Name wurde nicht angenommen. Versuch einen anderen.',
      password: 'Dieses Passwort wurde nicht angenommen. Wähle ein anderes.',
    },
    throttled: THROTTLED,
    failed: `Das Konto konnte nicht erstellt werden. ${CONNECTION}`,
    created: (email: string) =>
      `Willkommen! Wir haben dir einen Bestätigungslink an ${email} geschickt.`,
    closed: {
      title: 'Gerade keine neuen Konten',
      text: 'Lingora nimmt im Moment keine neuen Konten auf. Schau später wieder vorbei. Hast du schon ein Konto? Dann melde dich an.',
      login: 'Anmelden',
    },
  },
  login: {
    title: 'Willkommen zurück!',
    text: 'Schön, dass du wieder da bist. Melde dich an und lern gleich weiter.',
    submit: 'Anmelden',
    forgot: 'Passwort vergessen?',
    noAccount: 'Noch kein Konto?',
    register: 'Konto erstellen',
    legacy: 'Konto aus der früheren Einzelnutzer-Version?',
    wrongCredentials: 'E-Mail-Adresse oder Passwort stimmt nicht. Versuch es nochmals.',
    // Static on purpose: the alert is announced once, the countdown ticks in the button.
    throttled: 'Zu viele Fehlversuche. Mach kurz Pause, dann kannst du es nochmals versuchen.',
    failed: `Die Anmeldung hat nicht geklappt. ${CONNECTION}`,
  },
  legacyLogin: {
    title: 'Früheres Konto',
    text: 'Melde dich mit dem Passwort aus der Einzelnutzer-Version an. Danach ergänzt du einmal deine E-Mail-Adresse.',
    submit: 'Anmelden',
    unavailable:
      'Dein früheres Konto hat schon eine E-Mail-Adresse. Melde dich damit an, wie alle anderen auch.',
    toLogin: 'Zur Anmeldung',
  },
  forgotPassword: {
    title: 'Passwort vergessen?',
    text: 'Kein Problem. Gib deine E-Mail-Adresse ein, dann schicken wir dir einen Link für ein neues Passwort.',
    hint: 'Das klappt mit einer bestätigten E-Mail-Adresse.',
    submit: 'Link senden',
    sent: {
      title: 'Schau in dein Postfach',
      text: (email: string) =>
        `Falls es ein Konto mit ${email} gibt, ist ein Link für ein neues Passwort unterwegs. Schau auch im Spam-Ordner nach.`,
    },
    toLogin: 'Zur Anmeldung',
    toApp: 'Weiter zu Lingora',
    throttled: THROTTLED,
    failed: `Der Link konnte nicht angefordert werden. ${CONNECTION}`,
  },
  resetPassword: {
    title: 'Neues Passwort',
    text: 'Wähle ein neues Passwort für dein Konto.',
    newPasswordLabel: 'Neues Passwort',
    submit: 'Passwort speichern',
    done: {
      title: 'Passwort geändert!',
      text: 'Du kannst dich jetzt mit deinem neuen Passwort anmelden.',
    },
    toLogin: 'Zur Anmeldung',
    toApp: 'Weiter zu Lingora',
    requestNew: 'Neuen Link anfordern',
    requestNewHint: 'Fordere einfach einen neuen an.',
    failed: `Das Passwort konnte nicht gespeichert werden. ${CONNECTION}`,
  },
  verifyEmail: {
    checking: 'Deine E-Mail-Adresse wird bestätigt',
    done: {
      title: 'E-Mail-Adresse bestätigt!',
      text: 'Danke! Falls du dein Passwort einmal vergisst, kannst du es jetzt zurücksetzen.',
    },
    taken: {
      title: 'Adresse vergeben',
      text: 'Diese Adresse nutzt inzwischen ein anderes Konto. Wähle im Profil eine andere.',
    },
    expiredSignedIn: 'Kein Problem: Wir schicken dir gerne einen neuen.',
    expiredSignedOut: 'Melde dich an, dann kannst du einen neuen Link anfordern.',
    toApp: 'Weiter zu Lingora',
    toLogin: 'Zur Anmeldung',
    failedTitle: 'Das hat nicht geklappt',
    failed: `Die Bestätigung hat nicht geklappt. ${CONNECTION}`,
    retry: 'Nochmals versuchen',
  },
  link: {
    expired: { title: 'Link abgelaufen', text: 'Dieser Link ist nicht mehr gültig.' },
    invalid: {
      title: 'Link ungültig',
      text: 'Dieser Link ist ungültig oder wurde schon benutzt.',
    },
  },
} as const;
