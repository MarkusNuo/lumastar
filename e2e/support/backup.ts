import { readFile, writeFile } from 'node:fs/promises';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

/*
 * The export ZIP of PRD F11 (GET /api/profile/export): manifest.json, the profile documents of PRD
 * 8.3 under documents/ and the complete learner data under data/, one JSON array per table.
 */

export const DOCUMENTS = [
  'learner_profile.json',
  'skill_mastery.json',
  'recent_errors.json',
  'learning_plan.json',
  'learner_summary.md',
] as const;

/** The export format this Lingora writes; an import upgrades older ones and rejects newer ones (PRD 13). */
export const EXPORT_FORMAT = 2;

/** Learner tables of export format 2; data/profile.json holds the account row without its identity. */
export const DATA_TABLES = [
  'streaks',
  'fsrs_params',
  'learning_plans',
  'plan_changes',
  'placement_tests',
  'placement_answers',
  'sessions',
  'badges',
  'attempts',
  'skill_mastery',
  'srs_cards',
  'review_log',
] as const;
export type DataTable = (typeof DATA_TABLES)[number];

export const EXPECTED_ENTRIES = [
  'manifest.json',
  ...DOCUMENTS.map((name) => `documents/${name}`),
  'data/profile.json',
  ...DATA_TABLES.map((table) => `data/${table}.json`),
];

/** Error taxonomy of PRD F6. */
export const ERROR_CATEGORIES = [
  'vocab.unknown',
  'vocab.confused',
  'spelling.diacritics',
  'spelling.nasal_vowel',
  'spelling.other',
  'variant.standard_form',
  'grammar.definite_article',
  'grammar.case',
  'grammar.linking_article',
  'grammar.gender',
  'grammar.infinitive',
  'grammar.participle',
  'grammar.verb_conjugation',
  'grammar.verb_tense',
  'grammar.word_order',
  'grammar.clitics',
] as const;

/** "skill_mastery" → "skillMastery", the key of a table in the manifest counts. */
export const countKey = (table: DataTable) =>
  table.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

export type BackupCounts = Record<string, number>;

export interface Manifest {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  counts: BackupCounts;
}

/** learner_profile.json (PRD 8.3). */
export interface LearnerProfileDocument {
  schemaVersion: number;
  displayName: string;
  variety: string;
  motivation: string[];
  dailyGoalMinutes: number;
  currentLevel: string | null;
  targetLevel: string;
  xpTotal: number;
  streak: { current: number; longest: number };
}

/** One value of skill_mastery.json, keyed by skill tag (PRD 8.3). */
export interface MasteryDocument {
  mastery: number;
  attempts: number;
  correct: number;
  lastPracticed: string | null;
}

/** One entry of recent_errors.json (PRD 8.3). */
export interface RecentError {
  ts: string;
  exerciseType: string;
  skillTags: string[];
  errorCategory: string;
  prompt: string;
  expected: string | null;
  given: string | null;
}

/** learning_plan.json (PRD 8.3). */
export interface LearningPlanDocument {
  generatedAt: string | null;
  generatedBy: string | null;
  startLevel: string | null;
  stages: { level: string; units: { unitId: string; title: string; status: string }[] }[];
  estimates: Record<string, string>;
}

/** A row of data/attempts.json (columns as camelCase keys). */
export interface AttemptRow {
  id: string;
  sessionId: string;
  exerciseId: string;
  exerciseType: string;
  skillTags: string[];
  isRetry: boolean;
  outcome: string;
  errorCategory: string | null;
}

/** A row of data/placement_tests.json; `result` holds the initial mastery per skill tag (PRD F2). */
export interface PlacementTestRow {
  id: string;
  status: 'in_progress' | 'completed' | 'skipped' | 'abandoned';
  startLevel: string;
  resultLevel: string | null;
  result: { initialMastery: Record<string, number>; strengths: string[]; weaknesses: string[] } | null;
  finishedAt: string | null;
}

/** A row of data/placement_answers.json. */
export interface PlacementAnswerRow {
  placementTestId: string;
  position: number;
  exerciseId: string;
  level: string;
  competence: string;
  outcome: string;
}

/** A row of data/sessions.json; only a finished checkpoint has a result (format 2). */
export interface SessionRow {
  id: string;
  kind: string;
  unitId: string;
  finishedAt: string | null;
  exerciseCount: number;
  xpEarned: number;
  checkpointPassed: boolean | null;
}

/** A row of data/badges.json (format 2): a level badge, awarded by the checkpoint that completes a band. */
export interface BadgeRow {
  id: string;
  code: string;
  sessionId: string | null;
  awardedAt: string;
}

/** A row of data/srs_cards.json: the FSRS card of an item. */
export interface SrsCardRow {
  id: string;
  itemId: string;
  state: 'new' | 'learning' | 'review' | 'relearning';
}

/** A row of data/review_log.json; the target retention it was scheduled with is new in format 2. */
export interface ReviewLogRow {
  id: string;
  itemId: string;
  requestRetention: number;
}

export interface ProfileData {
  displayName: string;
  currentLevel: string | null;
  xpTotal: number;
  timeZone: string;
  [column: string]: unknown;
}

export class BackupArchive {
  private readonly entries: Record<string, Uint8Array>;

  constructor(entries: Record<string, Uint8Array>) {
    this.entries = entries;
  }

  static async read(file: string): Promise<BackupArchive> {
    return new BackupArchive(unzipSync(new Uint8Array(await readFile(file))));
  }

  names(): string[] {
    return Object.keys(this.entries);
  }

  text(name: string): string {
    const content = this.entries[name];
    if (!content) throw new Error(`The export has no entry ${name}`);
    return strFromU8(content);
  }

  json<T>(name: string): T {
    return JSON.parse(this.text(name)) as T;
  }

  manifest(): Manifest {
    return this.json<Manifest>('manifest.json');
  }

  document<T>(name: (typeof DOCUMENTS)[number]): T {
    return this.json<T>(`documents/${name}`);
  }

  rows<T>(table: DataTable): T[] {
    return this.json<T[]>(`data/${table}.json`);
  }
}

/** A copy of the object without one of its keys. */
function omit(row: Record<string, unknown>, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([name]) => name !== key));
}

/**
 * The export as a Lingora before M4 wrote it (format 1): without data/badges.json, without the
 * checkpoint result of each session and the target retention of each review. Format 1 could hold
 * neither badges nor checkpoints, so only an export without them can be turned back.
 */
export function asFormat1(backup: BackupArchive): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const name of backup.names().filter((entry) => entry !== 'data/badges.json')) {
    entries[name] = backup.text(name);
  }
  const manifest = backup.manifest();
  entries['manifest.json'] = JSON.stringify({
    ...manifest,
    schemaVersion: 1,
    counts: omit(manifest.counts, 'badges'),
  });
  const withoutColumn = (table: DataTable, column: string) =>
    JSON.stringify(backup.rows<Record<string, unknown>>(table).map((row) => omit(row, column)));
  entries['data/sessions.json'] = withoutColumn('sessions', 'checkpointPassed');
  entries['data/review_log.json'] = withoutColumn('review_log', 'requestRetention');
  return entries;
}

/** Writes a ZIP with the given text entries, e.g. a hand-made broken backup. */
export async function writeZip(file: string, entries: Record<string, string>): Promise<void> {
  const files = Object.fromEntries(
    Object.entries(entries).map(([name, content]) => [name, strToU8(content)]),
  );
  await writeFile(file, zipSync(files));
}

/** The calendar date of an instant in a time zone, as yyyy-MM-dd. */
export function localDate(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instant));
}
