import type { MascotExpression } from './Mascot';
import type { PathNodeStatus } from './PathNode';

/** Built-in copy of the shared UI components (German, Swiss orthography). */
export const UI_COPY = {
  bottomNav: 'Hauptnavigation',
  dailyGoal: 'Tagesziel',
  feedback: {
    continue: 'Weiter',
    correct: { title: 'Richtig!', solutionLabel: 'Lösung' },
    almost: { title: 'Fast richtig!', solutionLabel: 'Richtige Schreibweise' },
    standard: { title: 'Richtig, aber Standard', solutionLabel: 'Auf Gheg' },
    wrong: { title: 'Nicht ganz', solutionLabel: 'Richtige Lösung' },
  },
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
  streak: (days: number, active: boolean) =>
    `Streak: ${days} ${days === 1 ? 'Tag' : 'Tage'}${active ? '' : ', heute noch nicht gelernt'}`,
  unitBanner: { guidebook: 'Lernhilfe öffnen' },
  wordTile: { correct: 'richtig', wrong: 'falsch' },
} as const;
