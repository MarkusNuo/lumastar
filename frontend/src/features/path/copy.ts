import type { UnitBadge } from './learningPath';

/** UI copy of the learning path (German, Swiss orthography). */
export const PATH_COPY = {
  title: 'Lernpfad',
  loading: 'Lernpfad wird geladen',
  loadFailed: 'Der Lernpfad konnte nicht geladen werden. Prüfe deine Verbindung.',
  eyebrow: (level: string, unit: number) => `${level} · Einheit ${unit}`,
  focusEyebrow: 'Fokus-Lektion',
  lessonLabel: (lesson: number) => `Lektion ${lesson}`,
  focusLessonLabel: (lesson: number) => `Fokus-Lektion ${lesson}`,
  checkpointLabel: (level: string) => `Checkpoint ${level}`,
  stage: (level: string, title: string) => `${level} · ${title}`,
  start: 'Start',
  badges: {
    skipped: 'Übersprungen',
    comingSoon: 'Bald verfügbar',
  } satisfies Record<UnitBadge, string>,
  plan: {
    title: 'Dein Lernplan',
    goal: (band: string, date: string) => `${band} geschafft ca. am ${date}`,
    open: 'Lernplan bis C2 ansehen',
  },
} as const;
