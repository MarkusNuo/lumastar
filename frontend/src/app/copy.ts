/** App-wide UI copy (German, Swiss orthography). */
export const APP_COPY = {
  loading: 'Lumastar wird geladen',
  reviewsDue: (count: number) => `${count} ${count === 1 ? 'Karte' : 'Karten'} fällig`,
  connection: {
    title: 'Keine Verbindung',
    text: 'Lumastar erreicht den Server gerade nicht. Prüfe deine Verbindung und versuch es nochmals.',
    retry: 'Nochmals versuchen',
  },
  notFound: {
    title: 'Seite nicht gefunden',
    text: 'Diesen Weg gibt es nicht. Über die Navigation unten kommst du zurück.',
  },
} as const;
