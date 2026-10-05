import { expect, type APIRequestContext } from '@playwright/test';

/* The plan endpoints of PRD F3 the tests compare the screens with: path, plan and plan history. */

export type UnitStatus = 'planned' | 'in_progress' | 'completed' | 'skipped';

export interface PathUnit {
  unitId: string;
  title: string;
  status: UnitStatus;
  focus: boolean;
  hasContent: boolean;
  reason?: string;
  estimatedLessons: number;
  lessonsCompleted: number;
}

/** The test at the end of a stage (PRD 5): open once its units are done, passed with 80 % accuracy. */
export type CheckpointStatus = 'locked' | 'available' | 'passed';

export interface PathStage {
  level: string;
  title: string;
  checkpoint: { status: CheckpointStatus };
  units: PathUnit[];
}

/** GET /api/path: the plan from the current level up to C2.3 with the live progress. */
export interface LearningPath {
  currentLevel: string;
  targetLevel: string;
  dailyGoalMinutes: number;
  /** Expected day per CEFR band from A1 on, e.g. { A2: "2027-03-01" }. */
  estimates: Record<string, string>;
  stages: PathStage[];
}

/** GET /api/plan: the stored plan version. */
export interface Plan {
  version: number;
  startLevel: string;
  generatedBy: string;
  estimates: Record<string, string>;
}

export type PlanChangeKind =
  | 'plan_created'
  | 'focus_inserted'
  | 'unit_skipped'
  | 'unit_shortened'
  | 'level_changed'
  | 'replanned';

/** One entry of GET /api/plan/changes, newest plan version first. */
export interface PlanChange {
  planVersion: number;
  type: PlanChangeKind;
  trigger: string;
  reason: string;
  changedAt: string;
}

/** The CEFR bands of the plan timeline in order, with their names on the screen. */
export const BANDS = {
  A0: 'Start',
  A1: 'Einstieg',
  A2: 'Grundlagen',
  B1: 'Mittelstufe',
  B2: 'Gute Mittelstufe',
  C1: 'Fortgeschritten',
  C2: 'Fast wie Muttersprache',
} as const;
export type Band = keyof typeof BANDS;

export const PLAN_CHANGE_LABELS: Record<PlanChangeKind, string> = {
  plan_created: 'Plan erstellt',
  focus_inserted: 'Fokus-Lektion eingefügt',
  unit_skipped: 'Einheit übersprungen',
  unit_shortened: 'Einheit verkürzt',
  level_changed: 'Niveau geändert',
  replanned: 'Plan neu berechnet',
};

/** "A1.2" → "A1" */
export const bandOf = (level: string) => level.slice(0, 2) as Band;

async function getJson<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(path);
  expect(response.status(), `GET ${path}`).toBe(200);
  return (await response.json()) as T;
}

export const fetchPath = (request: APIRequestContext) => getJson<LearningPath>(request, '/api/path');
export const fetchPlan = (request: APIRequestContext) => getJson<Plan>(request, '/api/plan');
export const fetchPlanChanges = (request: APIRequestContext) =>
  getJson<PlanChange[]>(request, '/api/plan/changes');

/** The unit the path continues with: the one in progress. */
export function currentUnit(path: LearningPath): PathUnit {
  const unit = path.stages.flatMap((stage) => stage.units).find((candidate) => candidate.status === 'in_progress');
  if (!unit) throw new Error('The learning path has no unit in progress');
  return unit;
}

export function stageOf(path: LearningPath, level: string): PathStage {
  const stage = path.stages.find((candidate) => candidate.level === level);
  if (!stage) throw new Error(`The learning path has no stage ${level}`);
  return stage;
}

/**
 * The stage whose open checkpoint the path shows as the next step instead of a lesson, as the
 * frontend decides it: the first open checkpoint, unless a unit lesson of its stage or of an earlier
 * one is still to do. Focus lessons are extra practice and never hold a checkpoint back (PRD 5, F7).
 */
export function checkpointAsNextStep(path: LearningPath): PathStage | undefined {
  const open = path.stages.findIndex((stage) => stage.checkpoint.status === 'available');
  if (open < 0) return undefined;
  const lessonFirst = path.stages
    .slice(0, open + 1)
    .some((stage) =>
      stage.units.some((unit) => !unit.focus && unit.hasContent && unit.status === 'in_progress'),
    );
  return lessonFirst ? undefined : path.stages[open];
}

/** Focus units not played yet: each takes one focus lesson (PRD F3). */
export const openFocusUnits = (path: LearningPath) =>
  path.stages
    .flatMap((stage) => stage.units)
    .filter((unit) => unit.focus && unit.hasContent && unit.status !== 'completed');
