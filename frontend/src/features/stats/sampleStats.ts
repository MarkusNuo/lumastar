import type { HeatmapDay, Stats } from '../../api/types';

/*
 * Statistics of a learner at A1.2 after a few months, shaped like GET /api/stats, for unit tests
 * and the component catalog. The app itself only shows the learner's real statistics.
 */

const TODAY = '2026-10-05';
const DAY_MS = 86_400_000;

function isoDay(offset: number): string {
  const today = Date.UTC(2026, 9, 5);
  return new Date(today - offset * DAY_MS).toISOString().slice(0, 10);
}

/** A fixed, irregular rhythm: busy weeks, gaps, one bridged day. */
function sampleDay(offset: number): HeatmapDay {
  const date = isoDay(offset);
  if (offset > 150) return { date, minutes: 0, xp: 0, lessons: 0, goalMet: false, frozen: false };
  if (offset === 9) return { date, minutes: 0, xp: 0, lessons: 0, goalMet: false, frozen: true };
  const rhythm = (offset * 7 + (offset % 5) * 3) % 11;
  const minutes = rhythm < 3 ? 0 : rhythm < 6 ? 4 : rhythm * 2;
  return {
    date,
    minutes,
    xp: minutes * 3,
    lessons: Math.ceil(minutes / 4),
    goalMet: minutes >= 10,
    frozen: false,
  };
}

export const SAMPLE_STATS: Stats = {
  level: {
    level: 'A1.2',
    nextLevel: 'A1.3',
    title: 'Alltag zu Hause',
    percent: 57,
    unitsCompleted: 3,
    unitsSkipped: 1,
    unitsTotal: 7,
    checkpoint: 'locked',
  },
  masteryByArea: [
    { area: 'vocab', label: 'Wortschatz', skillTags: 6, mastery: 0.72 },
    { area: 'phrase', label: 'Wendungen', skillTags: 3, mastery: 0.58 },
    { area: 'grammar', label: 'Grammatik', skillTags: 8, mastery: 0.41 },
    { area: 'spelling', label: 'Schreiben', skillTags: 2, mastery: 0.63 },
    { area: 'reading', label: 'Lesen', skillTags: 0 },
  ],
  topErrors: [
    {
      skillTag: 'grammar.definite_article',
      label: 'Bestimmter Artikel',
      errors: 9,
      attempts: 20,
      errorRate: 0.45,
      category: 'grammar.definite_article',
      categoryLabel: 'Artikel',
      practice: { kind: 'practice', skillTag: 'grammar.definite_article' },
    },
    {
      skillTag: 'spelling.nasal_vowel',
      label: 'Nasalvokale',
      errors: 6,
      attempts: 18,
      errorRate: 0.333,
      category: 'spelling.nasal_vowel',
      categoryLabel: 'Zirkumflex fehlt',
      practice: { kind: 'practice', skillTag: 'spelling.nasal_vowel' },
    },
    {
      skillTag: 'grammar.clitics',
      label: 'Klitika',
      errors: 3,
      attempts: 4,
      errorRate: 0.75,
    },
  ],
  heatmap: {
    from: isoDay(364),
    to: TODAY,
    days: Array.from({ length: 365 }, (_, index) => sampleDay(364 - index)),
  },
  learnedWords: 128,
  forecast: {
    dueNow: 5,
    dueToday: 8,
    dueTomorrow: 34,
    days: [8, 34, 12, 0, 21, 6, 15].map((due, offset) => ({ date: isoDay(-offset), due })),
  },
};
