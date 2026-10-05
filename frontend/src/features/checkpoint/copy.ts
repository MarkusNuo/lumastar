import { formatShare as share } from '../../lib/formatPercent';

const swissDate = new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium' });

const bands = (codes: readonly string[]) => codes.join(' & ');

/** UI copy of the checkpoints and level badges (German, Swiss orthography). */
export const CHECKPOINT_COPY = {
  intro: {
    title: (level: string) => `Checkpoint ${level}`,
    facts: (exercises: number, required: number) =>
      `~${exercises} Aufgaben · ${share(required)} zum Bestehen`,
    levelUp: (next: string) => `Bestehst du, steigst du auf ${next} auf.`,
    lastStage: 'Bestehst du, hast du C2 geschafft.',
    text: 'Aufgaben aus allen Einheiten der Stufe, von leicht bis schwer. Du kannst ihn so oft versuchen, wie du willst.',
    start: 'Checkpoint starten',
    later: 'Später',
  },
  bubble: 'Checkpoint',
  failure: {
    title: 'Der Checkpoint konnte nicht starten',
    locked: 'Schliesse zuerst alle Einheiten dieser Stufe ab.',
    passed: 'Diesen Checkpoint hast du schon bestanden.',
    notFound: 'Diese Stufe gehört nicht zu deinem Lernplan.',
    back: 'Zum Lernpfad',
  },
  passed: {
    eyebrow: (level: string) => `Checkpoint ${level} bestanden!`,
    newLevel: (level: string) => `Du bist jetzt auf ${level}`,
    mastered: (level: string) => `Du hast ${level} gemeistert!`,
    text: 'Dein Lernplan ist schon angepasst. Weiter geht’s!',
    continue: 'Weiter',
  },
  badge: {
    eyebrow: (count: number) => (count === 1 ? 'Neues Abzeichen!' : `${count} neue Abzeichen!`),
    title: (codes: readonly string[]) => `Niveau ${bands(codes)} geschafft!`,
    text: (codes: readonly string[]) =>
      `Niveau ${bands(codes)} abgeschlossen. Im Profil findest du alle Abzeichen.`,
    continue: 'Weiter',
  },
  failed: {
    eyebrow: (level: string) => `Checkpoint ${level}`,
    title: 'Noch nicht ganz',
    text: (accuracy: number, required: number) =>
      `Du hattest ${share(accuracy)} richtig, zum Bestehen brauchst du ${share(required)}. Übe noch etwas, dann klappt es!`,
    goal: (required: number) => `${share(required)} zum Bestehen`,
    meter: (accuracy: number, required: number) =>
      `Deine Genauigkeit: ${share(accuracy)}, ${share(required)} zum Bestehen`,
    later: 'Später nochmals versuchen',
  },
  stats: {
    accuracy: 'Genauigkeit',
    xp: 'XP',
    time: 'Zeit',
  },
  profile: {
    title: 'Abzeichen',
    loading: 'Abzeichen werden geladen',
    loadFailed: 'Deine Abzeichen konnten nicht geladen werden.',
    earned: (awardedAt: string) => `seit ${swissDate.format(new Date(awardedAt))}`,
    open: 'noch offen',
    hint: 'Ein Abzeichen gibt es für den letzten Checkpoint jedes Niveaus.',
  },
} as const;
