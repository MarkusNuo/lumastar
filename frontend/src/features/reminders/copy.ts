import type { DevicePlatform } from './pushDevice';

const INSTALL_SUMMARY = 'Tippe auf Teilen → Zum Home-Bildschirm, dann öffne Lumastar von dort.';

/** UI copy of the reminders (German, Swiss orthography). */
export const REMINDER_COPY = {
  title: 'Erinnerungen',
  intro:
    'Lumastar erinnert dich, wenn dein Tagesziel noch offen ist, damit dein Streak weiterbrennt.',
  loading: 'Erinnerungen werden geladen',
  loadFailed: 'Die Erinnerungen konnten nicht geladen werden.',
  row: {
    label: 'Erinnerungen',
    on: (time: string) => `Täglich um ${time}`,
    off: 'Aus',
  },
  toggle: { label: 'Erinnerungen', description: 'Als Mitteilung auf diesem Gerät' },
  time: { label: 'Uhrzeit', description: 'Nur wenn dein Tagesziel noch offen ist' },
  rescue: {
    label: 'Streak-Retter am Abend',
    description: (time: string) => `Um ${time}, wenn dein Streak sonst reisst`,
    timeLabel: 'Uhrzeit des Streak-Retters',
  },
  problems: {
    missingTime: 'Wähle eine Uhrzeit.',
    rescueNotAfterTime:
      'Der Streak-Retter kommt nach der täglichen Erinnerung. Wähle eine spätere Uhrzeit.',
  },
  saved: 'Erinnerungen gespeichert',
  saveFailed: 'Die Uhrzeit konnte nicht gespeichert werden. Versuch es nochmals.',
  enabled: (time: string) => `Erinnerungen an: täglich um ${time}`,
  disabled: 'Erinnerungen auf diesem Gerät aus',
  enableFailed: {
    dismissed:
      'Ohne deine Erlaubnis kann Lumastar dich nicht erinnern. Tippe nochmals auf den Schalter, wenn du es dir anders überlegst.',
    pushServiceNotSupported:
      'Dieser Browser nutzt einen Mitteilungsdienst, den Lumastar nicht kennt. Versuch es in Chrome, Edge, Firefox oder Safari.',
    failed:
      'Die Erinnerungen konnten nicht eingeschaltet werden. Prüfe deine Verbindung und versuch es nochmals.',
  },
  disableFailed:
    'Die Erinnerungen konnten nicht ausgeschaltet werden. Prüfe deine Verbindung und versuch es nochmals.',
  otherDevices: (count: number) =>
    count === 1
      ? 'Auf einem anderen Gerät bekommst du schon Erinnerungen.'
      : `Auf ${count} anderen Geräten bekommst du schon Erinnerungen.`,
  test: {
    button: 'Test-Erinnerung senden',
    sent: 'Test-Erinnerung gesendet. Sie erscheint gleich.',
    notDelivered: 'Die Test-Erinnerung kam nicht an. Schalte die Erinnerungen aus und wieder ein.',
    noDevice:
      'Für dein Konto ist kein Gerät für Erinnerungen gespeichert. Schalte die Erinnerungen aus und wieder ein, dann speichert Lumastar dieses Gerät neu.',
    tooMany: 'Du hast schon viele Test-Erinnerungen gesendet. Versuch es später nochmals.',
    failed: 'Die Test-Erinnerung konnte nicht gesendet werden. Versuch es nochmals.',
  },
  installed: 'Als App installiert',
  installTip:
    'Tipp: Installiere Lumastar als App. Dann kommen die Erinnerungen wie bei jeder anderen App.',
  states: {
    serverUnavailable: {
      title: 'Erinnerungen sind noch nicht eingerichtet',
      text: 'Auf diesem Lumastar-Server sind Mitteilungen ausgeschaltet. Frag die Person, die Lumastar betreibt.',
    },
    unsupported: {
      title: 'Hier gehen keine Erinnerungen',
      text: {
        ios: 'Erinnerungen brauchen iOS 16.4 oder neuer. Aktualisiere dein Gerät und öffne Lumastar dann vom Home-Bildschirm.',
        android:
          'Dieser Browser kann keine Mitteilungen von Lumastar zeigen. Öffne Lumastar in Chrome, Firefox oder Samsung Internet.',
        desktop:
          'Dieser Browser kann keine Mitteilungen von Lumastar zeigen. Öffne Lumastar in Chrome, Edge, Firefox oder Safari.',
      } satisfies Record<DevicePlatform, string>,
    },
    denied: {
      title: 'Mitteilungen sind blockiert',
      text: 'Du hast Lumastar das Senden von Mitteilungen verboten. So erlaubst du es wieder:',
      steps: {
        ios: [
          'Öffne die Einstellungen und tippe auf Mitteilungen.',
          'Wähle Lumastar und erlaube Mitteilungen.',
        ],
        android: [
          'Öffne die Einstellungen und tippe auf Apps.',
          'Wähle Lumastar (oder deinen Browser) und erlaube Benachrichtigungen.',
        ],
        androidBrowser: [
          'Tippe in der Adressleiste auf das Symbol links neben der Adresse.',
          'Tippe auf Berechtigungen und stelle Benachrichtigungen auf „Zulassen“.',
        ],
        desktop: [
          'Klicke links neben der Adresse auf das Symbol der Website-Einstellungen. In der installierten App findest du sie im Menü unter App-Info.',
          'Stelle Benachrichtigungen auf „Zulassen“.',
        ],
      } satisfies Record<DevicePlatform | 'androidBrowser', string[]>,
      after: 'Komm danach hierher zurück und schalte die Erinnerungen ein.',
    },
    install: {
      title: 'Erst auf den Home-Bildschirm',
      text: 'Auf iPhone und iPad schickt Safari Mitteilungen nur an Apps auf dem Home-Bildschirm.',
      summary: INSTALL_SUMMARY,
      steps: [
        'Tippe in Safari auf Teilen.',
        'Wähle „Zum Home-Bildschirm“ und tippe auf Hinzufügen.',
        'Öffne Lumastar vom Home-Bildschirm und schalte hier die Erinnerungen ein.',
      ],
      illustration: 'Safari mit hervorgehobenem Teilen-Knopf und dem Eintrag „Zum Home-Bildschirm“',
      addToHomeScreen: 'Zum Home-Bildschirm',
    },
  },
  preview: {
    label: 'Vorschau einer Erinnerung',
    app: 'Lumastar',
    when: 'jetzt',
    title: 'Zeit für Gheg!',
    body: 'Dein 12-Tage-Streak wartet auf dich.',
    actions: ['Jetzt üben', 'In 1 Stunde'],
  },
  nudge: {
    title: 'Soll ich dich an deinen Streak erinnern?',
    text: 'Eine kurze Mitteilung am Abend, wenn dein Tagesziel noch offen ist.',
    accept: 'Ja, erinnere mich',
  },
} as const;
