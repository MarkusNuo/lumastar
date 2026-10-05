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
export const EXPORT_FORMAT = 3;

/** Learner tables of export format 3; data/profile.json holds the account row without its identity. */
export const DATA_TABLES = [
  'streaks',
  'fsrs_params',
  'learning_plans',
  'plan_changes',
  'placement_tests',
  'placement_answers',
  'sessions',
  'badges',
  'streak_days',
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

/** A row of data/sessions.json; only a finished checkpoint has a result (since format 2). */
export interface SessionRow {
  id: string;
  kind: string;
  unitId: string;
  finishedAt: string | null;
  exerciseCount: number;
  xpEarned: number;
  checkpointPassed: boolean | null;
}

/** A row of data/badges.json (since format 2): a level badge, awarded by the checkpoint that completes a band. */
export interface BadgeRow {
  id: string;
  code: string;
  sessionId: string | null;
  awardedAt: string;
}

/** A row of data/streak_days.json (format 3): a day that counted for the streak (PRD F9). */
export interface StreakDayRow {
  id: string;
  day: string;
  kind: 'goal_met' | 'freeze';
  goalMinutes: number | null;
  sessionId: string | null;
}

/** A row of data/srs_cards.json: the FSRS card of an item. */
export interface SrsCardRow {
  id: string;
  itemId: string;
  state: 'new' | 'learning' | 'review' | 'relearning';
}

/** A row of data/review_log.json; the target retention it was scheduled with is there since format 2. */
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

/** The text entries of a backup, e.g. to turn it into an older format before zipping it again. */
export type BackupEntries = Record<string, string>;

function entriesOf(backup: BackupArchive): BackupEntries {
  return Object.fromEntries(backup.names().map((name) => [name, backup.text(name)]));
}

/** Manifest and learner_profile.json name the version of the format (PRD 13). */
function withVersion(entries: BackupEntries, schemaVersion: number): BackupEntries {
  const versioned = { ...entries };
  for (const name of ['manifest.json', 'documents/learner_profile.json']) {
    const document = JSON.parse(entries[name] ?? '{}') as Record<string, unknown>;
    versioned[name] = JSON.stringify({ ...document, schemaVersion });
  }
  return versioned;
}

/** The entries without a learner table and without its row count in the manifest. */
function withoutTable(entries: BackupEntries, table: DataTable): BackupEntries {
  const rest = Object.fromEntries(Object.entries(entries).filter(([name]) => name !== `data/${table}.json`));
  const manifest = JSON.parse(entries['manifest.json'] ?? '{}') as Manifest;
  rest['manifest.json'] = JSON.stringify({ ...manifest, counts: omit(manifest.counts, countKey(table)) });
  return rest;
}

/** The entries with a column taken out of every row of a learner table. */
function withoutColumn(entries: BackupEntries, table: DataTable, column: string): BackupEntries {
  const file = `data/${table}.json`;
  const rows = JSON.parse(entries[file] ?? '[]') as Record<string, unknown>[];
  return { ...entries, [file]: JSON.stringify(rows.map((row) => omit(row, column))) };
}

/**
 * The export as a Lingora of M4 wrote it (format 2): without data/streak_days.json, new in format 3.
 * Format 2 could not hold the days of the streak, so an import of it restores none.
 */
export function asFormat2(backup: BackupArchive): BackupEntries {
  return withVersion(withoutTable(entriesOf(backup), 'streak_days'), 2);
}

/**
 * The export as a Lingora before M4 wrote it (format 1): format 2 without data/badges.json, without
 * the checkpoint result of each session and the target retention of each review. Format 1 could hold
 * neither badges nor checkpoints, so only an export without them can be turned back.
 */
export function asFormat1(backup: BackupArchive): BackupEntries {
  const withoutBadges = withoutTable(asFormat2(backup), 'badges');
  const withoutResults = withoutColumn(withoutBadges, 'sessions', 'checkpointPassed');
  return withVersion(withoutColumn(withoutResults, 'review_log', 'requestRetention'), 1);
}

/** Writes a ZIP with the given text entries, e.g. a hand-made broken backup. */
export async function writeZip(file: string, entries: BackupEntries): Promise<void> {
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
