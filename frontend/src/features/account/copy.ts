const CONNECTION = 'Prüfe deine Verbindung und versuch es nochmals.';

/** UI copy of the account settings and the e-mail verification (German, Swiss orthography). */
export const ACCOUNT_COPY = {
  back: 'Zurück',
  logout: {
    label: 'Abmelden',
    failed: `Abmelden hat nicht geklappt. ${CONNECTION}`,
  },
  section: {
    title: 'Konto',
    loading: 'Kontodaten werden geladen',
    loadFailed: 'Deine Kontodaten konnten nicht geladen werden.',
    email: { label: 'E-Mail-Adresse', none: 'Noch keine E-Mail-Adresse' },
    displayName: { label: 'Anzeigename' },
    password: { label: 'Passwort ändern', description: 'Mit deinem aktuellen Passwort' },
    delete: { label: 'Konto löschen', description: 'Konto und alle Lerndaten entfernen' },
  },
  status: {
    verified: 'Bestätigt',
    unverified: 'Nicht bestätigt',
    pending: 'Wechsel offen',
  },
  verification: {
    title: 'E-Mail bestätigen',
    text: (email: string) =>
      `Wir haben dir einen Link an ${email} geschickt. Damit kannst du später auch dein Passwort zurücksetzen.`,
    resend: 'Link erneut senden',
    wait: (countdown: string) => `Erneut senden (${countdown})`,
    sent: 'Ein neuer Link ist unterwegs. Schau in dein Postfach.',
    alreadyVerified: 'Deine E-Mail-Adresse ist schon bestätigt.',
    failed: 'Der Link konnte nicht gesendet werden. Versuch es später nochmals.',
  },
  displayName: {
    title: 'Anzeigename',
    submit: 'Speichern',
    saved: 'Name gespeichert',
    failed: `Dein Name konnte nicht gespeichert werden. ${CONNECTION}`,
  },
  email: {
    title: 'E-Mail-Adresse',
    current: 'Aktuelle Adresse',
    none: 'Dein Konto hat noch keine E-Mail-Adresse.',
    pending: (email: string) => `Neue Adresse wartet auf Bestätigung: ${email}`,
    pendingHint: 'Öffne den Link in der E-Mail an diese Adresse, dann wechselt dein Konto.',
    change: 'Adresse ändern',
    newLabel: 'Neue E-Mail-Adresse',
    passwordHint: 'Zur Sicherheit brauchen wir dein Passwort.',
    submit: 'Bestätigungslink senden',
    same: 'Das ist schon deine Adresse.',
    cancelHint: 'Gib deine aktuelle Adresse ein, um den Wechsel abzubrechen.',
    taken: 'Mit dieser E-Mail-Adresse gibt es schon ein Konto.',
    pendingSent: {
      title: 'Fast geschafft!',
      text: (email: string) =>
        `Wir haben einen Link an ${email} geschickt. Deine Adresse wechselt, sobald du ihn öffnest.`,
    },
    replaced: {
      title: 'Adresse gespeichert',
      text: (email: string) =>
        `Bestätige ${email} noch mit dem Link, den wir dir eben geschickt haben.`,
    },
    cancelled: {
      title: 'Wechsel abgebrochen',
      text: (email: string) => `Deine Adresse bleibt ${email}.`,
    },
    done: 'Zurück zum Profil',
    failed: `Die Adresse konnte nicht geändert werden. ${CONNECTION}`,
  },
  password: {
    title: 'Passwort ändern',
    currentLabel: 'Aktuelles Passwort',
    newLabel: 'Neues Passwort',
    submit: 'Passwort ändern',
    wrongCurrent: 'Dein aktuelles Passwort stimmt nicht.',
    saved: 'Passwort geändert',
    failed: `Das Passwort konnte nicht geändert werden. ${CONNECTION}`,
  },
  delete: {
    title: 'Konto löschen',
    heading: 'Schade, dass du gehst!',
    intro: 'Wenn du dein Konto löschst, ist alles endgültig weg:',
    consequences: [
      'dein Konto mit E-Mail-Adresse und Namen',
      'dein Lernstand, deine Antworten und Wiederholungen',
      'dein Streak, deine XP und Abzeichen',
      'dein Lernplan und deine Einstellungen',
    ],
    irreversible: 'Das lässt sich nicht rückgängig machen.',
    backup: {
      title: 'Erst ein Backup?',
      text: 'Lade deine Lerndaten als ZIP-Datei herunter. Du kannst sie später in ein neues Konto importieren.',
      button: 'Backup herunterladen',
    },
    passwordHint: 'Bestätige mit deinem Passwort.',
    submit: 'Konto löschen',
    confirm: {
      title: 'Wirklich löschen?',
      text: 'Dein Konto und alle Lerndaten werden sofort und endgültig gelöscht.',
      cancel: 'Konto behalten',
      confirm: 'Endgültig löschen',
    },
    deleted: 'Dein Konto ist gelöscht. Mach’s gut!',
    failed: `Das Konto konnte nicht gelöscht werden. ${CONNECTION}`,
  },
  addEmail: {
    saved: (email: string) => `Gespeichert! Bestätige ${email} noch mit dem Link aus der E-Mail.`,
    title: 'Eine Sache noch: deine E-Mail-Adresse',
    text: 'Lumastar hat jetzt Konten für mehrere Personen. Ab jetzt meldest du dich mit deiner E-Mail-Adresse an. Deine Lerndaten bleiben, wie sie sind.',
    submit: 'Speichern und weiter',
  },
} as const;
