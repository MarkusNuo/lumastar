import type { ExerciseType, LessonKind, WordPair } from './model';

/** Quotes a word the German way, as the backend's hint texts do. */
const quote = (text: string) => `„${text}“`;

const bold = (words: string[]) => words.map((word) => `**${word}**`).join(', ');

function enumerate(phrases: string[]): string {
  if (phrases.length <= 1) return phrases.join('');
  return `${phrases.slice(0, -1).join(', ')} und ${phrases.at(-1) ?? ''}`;
}

const MAX_LISTED_SWAPS = 3;

/** UI copy of the lesson player (German, Swiss orthography). */
export const LESSON_COPY = {
  loading: 'Lektion wird vorbereitet',
  progressLabel: 'Lektionsfortschritt',
  progressValue: (done: number, total: number) => `${done} von ${total} Übungen geschafft`,
  close: 'Lektion schliessen',
  check: 'Prüfen',
  continue: 'Weiter',
  retryBadge: 'Nochmals',
  quit: {
    title: 'Lektion wirklich beenden?',
    text: 'Dein Fortschritt in dieser Lektion geht verloren.',
    stay: 'Weiterlernen',
    leave: 'Beenden',
  },
  failure: {
    title: 'Die Lektion konnte nicht starten',
    network: 'Lingora erreicht den Server gerade nicht. Prüfe deine Verbindung.',
    noContent: 'Für diese Einheit gibt es noch keine Übungen.',
    unknownUnit: 'Diese Einheit gibt es nicht.',
    retry: 'Nochmals versuchen',
    back: 'Zum Lernpfad',
  },
  saving: 'Ergebnis wird gespeichert',
  result: {
    titles: {
      lesson: 'Lektion geschafft!',
      focus: 'Fokus-Lektion geschafft!',
      review: 'Wiederholung geschafft!',
      checkpoint: 'Checkpoint beendet',
      practice: 'Gezielt geübt!',
    } satisfies Record<LessonKind, string>,
    perfectTitle: 'Fehlerfrei!',
    summary: (correct: number, total: number) =>
      `${correct} von ${total} Übungen hast du auf Anhieb richtig gelöst.`,
    xp: 'XP',
    accuracy: 'Genauigkeit',
    time: 'Zeit',
    xpValue: (xp: number) => `${xp} XP verdient`,
    xpUnknown: 'XP noch offen',
    breakdown: {
      base: 'Basis',
      perfectBonus: 'Fehlerfrei',
      speedBonus: 'Tempo',
    },
    learnedTitle: 'Geübte Wörter',
    showAllWords: (count: number) => `Alle ${count} anzeigen`,
    showFewerWords: 'Weniger anzeigen',
    notSaved:
      'Dein Ergebnis konnte noch nicht gespeichert werden. XP und geübte Wörter erscheinen, sobald es geklappt hat.',
    retrySave: 'Nochmals speichern',
    continue: 'Weiter',
    focus: {
      eyebrow: 'Fokus-Lektion vorgeschlagen',
      /** Names the card as one phrase; the eyebrow and the label are two lines on screen. */
      title: (label: string) => `Fokus-Lektion vorgeschlagen: ${label}`,
      text: 'Hier hattest du mehrere Fehler. Eine kurze Fokus-Lektion festigt genau das.',
      start: 'Fokus-Lektion starten',
    },
  },
  /** Exercises whose prompt is not a question show this as their title. */
  instructions: {
    translate_wordbank: 'Übersetze diesen Satz',
    translate_free: 'Übersetze diesen Satz',
    fill_gap: 'Fülle die Lücke',
    word_order: 'Bilde den Satz',
  } satisfies Partial<Record<ExerciseType, string>>,
  unreviewed: {
    label: 'Ungeprüft',
    explanation: 'Diese Übung wurde noch nicht von einer Fachperson geprüft.',
  },
  answerLabel: {
    sq: 'Deine Antwort auf Gheg',
    de: 'Deine Antwort auf Deutsch',
  },
  answerPlaceholder: {
    sq: 'Schreib auf Gheg',
    de: 'Schreib auf Deutsch',
  },
  answerLine: 'Deine Antwort',
  wordBank: 'Wortbausteine',
  gapLabel: 'Lücke',
  gapChoices: 'Antwortmöglichkeiten',
  pairs: {
    gheg: 'Gheg',
    german: 'Deutsch',
    matched: 'zugeordnet',
  },
  /** Mirrors the hint texts of the backend so the instant pre-check reads the same. */
  hints: {
    standardForm: (swaps: { gheg: string; standard: string }[], solution: string) =>
      swaps.length === 0 || swaps.length > MAX_LISTED_SWAPS
        ? `Auf Gheg sagt man eher: ${quote(solution)}`
        : `Auf Gheg sagt man eher ${enumerate(
            swaps.map((swap) => `${bold([swap.gheg])} statt ${bold([swap.standard])}`),
          )}.`,
    missingCircumflex: (words: string[]) => `Achte auf den Zirkumflex: ${bold(words)}`,
    missingDiacritics: (words: string[]) => `Achte auf die Sonderzeichen: ${bold(words)}`,
    typo: (words: string[]) => `Achte auf die Schreibweise: ${bold(words)}`,
    wordOrder: 'Die Wörter stimmen, aber die Reihenfolge noch nicht.',
    /** The correct pairs of the confused items: „Richtig ist: **Po** = Ja und **Jo** = Nein.“ */
    confusedPairs: (pairs: readonly WordPair[]) =>
      `Richtig ist: ${enumerate(pairs.map((pair) => `${bold([pair.left])} = ${pair.right}`))}.`,
  },
} as const;
