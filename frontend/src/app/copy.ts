/** App-wide UI copy (German, Swiss orthography). */
export const APP_COPY = {
  loading: 'Lingora wird geladen',
  reviewsDue: (count: number) => `${count} ${count === 1 ? 'Wort' : 'Wörter'} fällig`,
  connection: {
    title: 'Keine Verbindung',
    text: 'Lingora erreicht den Server gerade nicht. Prüfe deine Verbindung und versuch es nochmals.',
    retry: 'Nochmals versuchen',
  },
  placeholder: {
    badge: 'Kommt bald',
    text: 'Diese Ansicht entsteht gerade. Schau bald wieder vorbei!',
    notFoundTitle: 'Seite nicht gefunden',
    notFoundText: 'Diesen Weg gibt es nicht. Über die Navigation unten kommst du zurück.',
  },
} as const;
