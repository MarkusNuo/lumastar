import type { MascotExpression } from './Mascot';
import type { PathNodeStatus } from './PathNode';

/** Built-in copy of the shared UI components (German, Swiss orthography). */
export const UI_COPY = {
  bottomNav: 'Hauptnavigation',
  combo: (count: number) => `${count} richtig in Folge!`,
  dailyGoal: 'Tagesziel',
  feedback: {
    continue: 'Weiter',
    correct: { title: 'Richtig!', solutionLabel: 'Lösung' },
    almost: { title: 'Fast richtig!', solutionLabel: 'Richtige Schreibweise' },
    standard: { title: 'Richtig, aber Standard', solutionLabel: 'Auf Gheg' },
    wrong: { title: 'Nicht ganz', solutionLabel: 'Richtige Lösung' },
  },
  bandBadge: (band: string, locked: boolean) =>
    `Abzeichen ${band}${locked ? ', noch nicht verdient' : ''}`,
  levelBadge: (name: string, locked: boolean) =>
    `Niveau ${name}${locked ? ', noch nicht erreicht' : ''}`,
  mascot: {
    label: (expression: MascotExpression) =>
      `Maskottchen ${UI_COPY.mascot.expressions[expression]}`,
    expressions: {
      happy: 'freut sich',
      encouraging: 'ermutigt dich',
      thinking: 'denkt nach',
      celebrating: 'feiert',
      sad: 'ist traurig',
    } satisfies Record<MascotExpression, string>,
  },
  password: { show: 'Passwort anzeigen' },
  pathNode: {
    start: 'Start',
    status: {
      locked: 'gesperrt',
      available: 'verfügbar',
      current: 'als Nächstes',
      completed: 'abgeschlossen',
    } satisfies Record<PathNodeStatus, string>,
  },
  specialChars: {
    group: 'Sonderzeichen',
    shift: 'Grossbuchstaben',
    insert: (char: string) => `${char} einfügen`,
  },
  retry: 'Nochmals versuchen',
  sheet: { close: 'Schliessen' },
  streak: (days: number, active: boolean) =>
    `Streak: ${days} ${days === 1 ? 'Tag' : 'Tage'}${active ? '' : ', heute noch nicht gelernt'}`,
  toast: { dismiss: 'Meldung schliessen' },
  unitBanner: { guidebook: 'Lernhilfe öffnen' },
  wordTile: { correct: 'richtig', wrong: 'falsch' },
} as const;
