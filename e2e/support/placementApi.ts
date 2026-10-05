import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Response } from '@playwright/test';
import { normalizeAnswer } from './answers.ts';
import { WRONG_TEXT } from './lessonAnswers.ts';
import { PATHS } from './env.ts';
import type { ExerciseType, Lang } from './lessonApi.ts';

/*
 * The placement test of PRD F2 as the e2e tests see it: the API responses the screens are built
 * from, and the solutions of the item bank, which the API never sends (the test gives no feedback).
 */

export type Competence = 'vocabulary' | 'grammar' | 'reading' | 'translation';

/** An item as the API sends it: without solutions. */
export interface PlacementItem {
  id: string;
  type: ExerciseType;
  competence: Competence;
  prompt: { lang: Lang; text: string };
  answerLang?: Lang;
  choices?: string[];
  text?: string;
  tokens?: string[];
  wordBank?: string[];
}

export interface StartPlacementResponse {
  testId: string;
  startLevel: string;
  item: PlacementItem;
  position: number;
  maxItems: number;
}

export interface PlacementAnswerResponse {
  finished: boolean;
  nextItem?: PlacementItem;
  /** Of the next item; when finished, the number of answered items. */
  position: number;
}

export interface SkillEstimate {
  skillTag: string;
  label: string;
  mastery: number;
}

export interface PlacementResult {
  testId: string;
  skipped: boolean;
  level: string;
  levelTitle: string;
  startLevel: string;
  answeredCount: number;
  strengths: SkillEstimate[];
  weaknesses: SkillEstimate[];
  competences: { competence: Competence; answered: number; correct: number }[];
}

const pathOf = (response: Response) => new URL(response.url()).pathname;
const isPost = (response: Response) => response.request().method() === 'POST';

export const isPlacementStart = (response: Response) =>
  isPost(response) && pathOf(response) === '/api/placement';

export const isPlacementSkip = (response: Response) =>
  isPost(response) && pathOf(response) === '/api/placement/skip';

export const isPlacementAnswer = (response: Response) =>
  isPost(response) && /^\/api\/placement\/[^/]+\/answers$/.test(pathOf(response));

export const isPlacementResult = (response: Response) =>
  response.request().method() === 'GET' && /^\/api\/placement\/[^/]+\/result$/.test(pathOf(response));

/** What the bank knows about an item beyond the API: its stage and its solutions. */
export interface BankItem {
  id: string;
  level: string;
  solutions: string[];
}

/** content/placement.json of the content the backend seeded (see PATHS.content). */
export function readPlacementBank(): Map<string, BankItem> {
  const file = path.join(PATHS.content, 'placement.json');
  const { exercises } = JSON.parse(readFileSync(file, 'utf8')) as { exercises: BankItem[] };
  return new Map(exercises.map((item) => [item.id, item]));
}

/** How the test answers an item on the screen: one option, some chips or a typed text. */
export type PlacementAnswer =
  | { kind: 'option'; choice: string }
  | { kind: 'gap-chip'; choice: string }
  | { kind: 'chips'; chips: string[] }
  | { kind: 'text'; text: string };

/**
 * An answer that is wrong for sure: the solutions are known, so neither a lucky choice nor a chip
 * that happens to be a whole solution slips through. Wrong answers walk the staircase down to A0,
 * where two more end it, so the result (and the plan after it) is the same in every run, whichever
 * items the engine picks.
 */
export function wrongAnswer(item: PlacementItem, bank: ReadonlyMap<string, BankItem>): PlacementAnswer {
  const solutions = bank.get(item.id)?.solutions;
  if (!solutions) throw new Error(`Placement item ${item.id} is not in content/placement.json`);
  const isSolution = (text: string) =>
    solutions.some((solution) => normalizeAnswer(solution) === normalizeAnswer(text));
  const wrongChoice = () => {
    const choice = (item.choices ?? []).find((candidate) => !isSolution(candidate));
    if (choice === undefined) throw new Error(`Placement item ${item.id} has no wrong choice`);
    return choice;
  };

  switch (item.type) {
    case 'multiple_choice':
      return { kind: 'option', choice: wrongChoice() };
    case 'fill_gap':
      return item.choices
        ? { kind: 'gap-chip', choice: wrongChoice() }
        : { kind: 'text', text: WRONG_TEXT };
    case 'translate_free':
      return { kind: 'text', text: WRONG_TEXT };
    case 'translate_wordbank':
    case 'word_order': {
      const chips = (item.type === 'word_order' ? item.tokens : item.wordBank) ?? [];
      // The first chip alone, or the first two if that one word already is a solution.
      const answer = chips.slice(0, isSolution(chips[0] ?? '') ? 2 : 1);
      if (answer.length === 0 || isSolution(answer.join(' '))) {
        throw new Error(`No wrong chips for placement item ${item.id}`);
      }
      return { kind: 'chips', chips: answer };
    }
    case 'match_pairs':
      throw new Error(`Placement items of type ${item.type} do not exist`);
  }
}
