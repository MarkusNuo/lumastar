/** UI copy of the first start after the account step (German, Swiss orthography). */
export const ONBOARDING_COPY = {
  back: 'Zurück',
  progressLabel: 'Einrichtung',
  progressValue: (step: number, total: number) => `Schritt ${step} von ${total}`,
  loading: 'Fragen werden geladen',
  loadFailed: 'Die Fragen konnten nicht geladen werden. Prüfe deine Verbindung.',
  next: 'Weiter',
  motivation: {
    question: 'Warum lernst du Gheg?',
    hint: 'Wähle alles, was passt.',
  },
  dailyGoal: {
    question: 'Wie viel Zeit nimmst du dir pro Tag?',
    hint: 'Schon ein paar Minuten täglich bringen dich weit.',
    minutes: (minutes: number) => `${minutes} Min. pro Tag`,
    /** Playful names of the usual goals; other values only show their minutes. */
    names: {
      5: 'Gemütlich',
      10: 'Dranbleiben',
      15: 'Mit Schwung',
      20: 'Volle Kraft',
    } as Readonly<Record<number, string>>,
  },
  selfAssessment: {
    question: 'Wie gut kannst du schon Gheg?',
    hint: 'Danach startet der Einstufungstest auf deinem Niveau.',
  },
  saveFailed: 'Deine Antworten konnten nicht gespeichert werden. Versuch es nochmals.',
  account: {
    open: 'Konto',
    title: 'Dein Konto',
    text: 'Du kannst dich jederzeit wieder anmelden und die Einrichtung fortsetzen.',
  },
} as const;
