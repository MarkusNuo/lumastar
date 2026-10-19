/* The FSRS cards hold words, phrases and grammar points alike, so the tab counts "Karten". */
const cards = (count: number) => (count === 1 ? 'Karte' : 'Karten');

/** UI copy of the review tab (German, Swiss orthography). */
export const REVIEW_COPY = {
  title: 'Wiederholen',
  loading: 'Wiederholungen werden geladen',
  loadFailed: 'Deine Wiederholungen konnten nicht geladen werden. Prüfe deine Verbindung.',
  explanation:
    'Jedes Wort und jede Regel, die du übst, wird zu einer Karte. Lumastar plant jede Wiederholung mit FSRS: kurz bevor du sie vergessen würdest, kommt sie wieder.',
  due: {
    label: (count: number) => `${cards(count)} fällig`,
    text: 'Eine kurze Lektion mit genau den Karten, die jetzt dran sind.',
    start: 'Wiederholung starten',
  },
  allDone: {
    title: 'Alles wiederholt!',
    text: 'Für heute ist alles aufgefrischt. Schau morgen wieder vorbei!',
    learn: 'Neue Lektion lernen',
  },
  empty: {
    title: 'Noch nichts zu wiederholen',
    text: 'Sobald du Lektionen lernst, erscheint hier, was du auffrischen solltest.',
    learn: 'Zur ersten Lektion',
  },
  stats: {
    tomorrow: 'Morgen fällig',
    total: 'Karten gesamt',
  },
  lesson: {
    failureTitle: 'Die Wiederholung konnte nicht starten',
    nothingDue: 'Gerade ist nichts fällig, das sich üben lässt. Schau etwas später wieder vorbei!',
    back: 'Zurück zu Wiederholen',
  },
} as const;
