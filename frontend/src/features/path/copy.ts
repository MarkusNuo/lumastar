/** UI copy of the learning path (German, Swiss orthography). */
export const PATH_COPY = {
  title: 'Lernpfad',
  loading: 'Lernpfad wird geladen',
  loadFailed: 'Der Lernpfad konnte nicht geladen werden. Prüfe deine Verbindung.',
  retry: 'Nochmals versuchen',
  eyebrow: (level: string, unit: number) => `${level} · Einheit ${unit}`,
  lessonLabel: (lesson: number) => `Lektion ${lesson}`,
  stage: (level: string, title: string) => `${level} · ${title}`,
  start: 'Start',
} as const;
