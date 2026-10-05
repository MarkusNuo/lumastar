const words = (count: number) => (count === 1 ? 'Wort' : 'Wörter');

/** UI copy of the review tab (German, Swiss orthography). */
export const REVIEW_COPY = {
  title: 'Wiederholen',
  loading: 'Wiederholungen werden geladen',
  loadFailed: 'Deine Wiederholungen konnten nicht geladen werden. Prüfe deine Verbindung.',
  explanation:
    'Lingora plant jede Wiederholung mit FSRS: kurz bevor du ein Wort vergessen würdest, kommt es wieder.',
  due: {
    label: (count: number) => `${words(count)} fällig`,
    text: 'Eine kurze Lektion mit genau den Wörtern, die jetzt dran sind.',
    start: 'Wiederholung starten',
  },
  allDone: {
    title: 'Alles wiederholt!',
    text: (dueTomorrow: number) =>
      dueTomorrow > 0 ? `Morgen fällig: ${dueTomorrow}` : 'Morgen ist nichts fällig.',
    learn: 'Neue Lektion lernen',
  },
  empty: {
    title: 'Noch nichts zu wiederholen',
    text: 'Sobald du Lektionen lernst, erscheinen hier die Wörter, die du auffrischen solltest.',
    learn: 'Zur ersten Lektion',
  },
  stats: {
    tomorrow: 'Morgen fällig',
    total: 'Wörter gesamt',
  },
  lesson: {
    failureTitle: 'Die Wiederholung konnte nicht starten',
    nothingDue: 'Gerade ist nichts fällig, das sich üben lässt. Schau etwas später wieder vorbei!',
    back: 'Zurück zu Wiederholen',
  },
} as const;
