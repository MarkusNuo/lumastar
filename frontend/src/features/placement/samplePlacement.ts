import type { PlacementItem, PlacementResult } from '../../api/types';

/*
 * Placement items of content/placement.json as GET /api/placement serves them (no solutions) and a
 * result for unit tests and the component catalog. The app itself only shows items from the API.
 */

export const SAMPLE_PLACEMENT_CHOICE: PlacementItem = {
  id: 'pl_a0_001',
  type: 'multiple_choice',
  competence: 'vocabulary',
  reviewed: false,
  prompt: { lang: 'de', text: 'Was bedeutet „mirëdita“?' },
  choices: ['Gute Nacht', 'Guten Tag', 'Auf Wiedersehen', 'Danke'],
};

export const SAMPLE_PLACEMENT_GAP: PlacementItem = {
  id: 'pl_a0_004',
  type: 'fill_gap',
  competence: 'grammar',
  reviewed: false,
  prompt: { lang: 'de', text: 'Ich bin Arta.' },
  answerLang: 'sq',
  text: '___ jam Arta.',
  choices: ['Ai', 'Unë', 'Ti', 'Ajo'],
};

export const SAMPLE_PLACEMENT_FREE: PlacementItem = {
  id: 'pl_a1_1_006',
  type: 'translate_free',
  competence: 'translation',
  reviewed: false,
  prompt: { lang: 'de', text: 'Wie heisst du?' },
  answerLang: 'sq',
};

export const SAMPLE_PLACEMENT_WORDBANK: PlacementItem = {
  id: 'pl_a0_005',
  type: 'translate_wordbank',
  competence: 'translation',
  reviewed: false,
  prompt: { lang: 'de', text: 'Ja, danke.' },
  answerLang: 'sq',
  wordBank: ['mirëdita', 'faleminderit', 'Po', 'jo'],
};

export const SAMPLE_PLACEMENT_WORD_ORDER: PlacementItem = {
  id: 'pl_a1_2_006',
  type: 'word_order',
  competence: 'translation',
  reviewed: false,
  prompt: { lang: 'de', text: 'Ich trinke keinen Kaffee.' },
  answerLang: 'sq',
  tokens: ['pi', 'Unë', 'kafe', 'nuk'],
};

export const SAMPLE_PLACEMENT_RESULT: PlacementResult = {
  testId: '7a4f0c2e-5b1d-4c3a-9e8f-1d2c3b4a5f60',
  level: 'A1.2',
  levelTitle: 'Alltag zu Hause',
  startLevel: 'A1.1',
  skipped: false,
  answeredCount: 12,
  finishedAt: '2026-10-05T08:00:00Z',
  competences: [
    { competence: 'vocabulary', answered: 4, correct: 3 },
    { competence: 'grammar', answered: 3, correct: 1 },
    { competence: 'reading', answered: 2, correct: 2 },
    { competence: 'translation', answered: 3, correct: 2 },
  ],
  strengths: [
    { skillTag: 'vocab.greetings', label: 'Begrüssung', mastery: 0.9 },
    { skillTag: 'vocab.numbers', label: 'Zahlen', mastery: 0.8 },
    { skillTag: 'phrase.introductions', label: 'Sich vorstellen', mastery: 0.8 },
  ],
  weaknesses: [
    { skillTag: 'grammar.definite_article', label: 'Bestimmter Artikel', mastery: 0.3 },
    { skillTag: 'grammar.verbs.kam', label: 'Verb kam', mastery: 0.3 },
    { skillTag: 'vocab.food', label: 'Essen & Trinken', mastery: 0.4 },
  ],
  dailyGoal: { minutesToday: 4, goalMinutes: 10, goalMet: false, justMet: false },
  streak: { current: 0, extendedToday: false, freezeUsed: false },
};
