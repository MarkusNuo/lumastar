import type { LearningPath, LearningPathUnit, PlanChange } from '../../api/types';

/*
 * A plan after a placement at A1.2, shaped like GET /api/path and /api/plan/changes, for unit
 * tests and the component catalog. The app itself only shows the learner's real plan.
 */

const unit = (
  fields: Pick<LearningPathUnit, 'unitId' | 'title'> & Partial<LearningPathUnit>,
): LearningPathUnit => ({
  estimatedLessons: 4,
  lessonsCompleted: 0,
  focus: false,
  hasContent: true,
  status: 'planned',
  ...fields,
});

export const SAMPLE_PATH: LearningPath = {
  currentLevel: 'A1.2',
  targetLevel: 'C2',
  dailyGoalMinutes: 10,
  estimates: {
    A1: '2026-11-16',
    A2: '2027-02-08',
    B1: '2027-06-14',
    C2: '2029-03-05',
  },
  stages: [
    {
      level: 'A1.2',
      title: 'Alltag zu Hause',
      checkpoint: { status: 'locked', exerciseCount: 15, requiredAccuracy: 0.8 },
      units: [
        unit({
          unitId: 'a1_u05_food_drink',
          title: 'Essen & Trinken',
          color: 'amber',
          status: 'skipped',
          estimatedLessons: 5,
          reason: 'Im Einstufungstest schon sicher (85 %)',
        }),
        unit({
          unitId: 'a1_u06_home',
          title: 'Zuhause',
          color: 'lime',
          status: 'in_progress',
          lessonsCompleted: 2,
        }),
        unit({
          unitId: 'focus_grammar_definite_article',
          title: 'Bestimmter Artikel üben',
          icon: 'target',
          focus: true,
          estimatedLessons: 2,
          reason: 'Fehlerquote 45 % bei Bestimmter Artikel',
        }),
        unit({
          unitId: 'a1_u07_definite_article',
          title: 'Bestimmter Artikel',
          color: 'indigo',
          estimatedLessons: 5,
        }),
      ],
    },
    {
      level: 'A1.3',
      title: 'Tun & beschreiben',
      checkpoint: { status: 'locked', exerciseCount: 15, requiredAccuracy: 0.8 },
      units: [
        unit({
          unitId: 'a1_u09_present_regular',
          title: 'Präsens regelmässiger Verben',
          color: 'violet',
          estimatedLessons: 5,
        }),
      ],
    },
    {
      level: 'A2.1',
      title: 'Mein Alltag',
      checkpoint: { status: 'locked', exerciseCount: 15, requiredAccuracy: 0.8 },
      units: [
        unit({
          unitId: 'a2_u01_daily_routine',
          title: 'Tagesablauf',
          color: 'lime',
          estimatedLessons: 5,
        }),
      ],
    },
    {
      level: 'B1.1',
      title: 'Erzählen & wohnen',
      checkpoint: { status: 'locked', exerciseCount: 15, requiredAccuracy: 0.8 },
      units: [
        unit({
          unitId: 'b1_u01_imperfect',
          title: 'Wie es früher war',
          color: 'violet',
          hasContent: false,
          estimatedLessons: 6,
        }),
      ],
    },
    {
      level: 'C2.3',
      title: 'Meisterschaft',
      checkpoint: { status: 'locked', exerciseCount: 15, requiredAccuracy: 0.8 },
      units: [
        unit({
          unitId: 'c2_u05_style',
          title: 'Stil & Ausdruck',
          color: 'indigo',
          hasContent: false,
          estimatedLessons: 6,
        }),
      ],
    },
  ],
};

export const SAMPLE_PLAN_CHANGES: PlanChange[] = [
  {
    changedAt: '2026-10-12T08:00:00Z',
    planVersion: 2,
    trigger: 'periodic',
    type: 'focus_inserted',
    reason: 'Fokus-Lektion „Bestimmter Artikel“ eingefügt, Fehlerquote 45 %',
  },
  {
    changedAt: '2026-10-05T08:00:00Z',
    planVersion: 1,
    trigger: 'placement',
    type: 'plan_created',
    reason: 'Plan nach dem Einstufungstest erstellt: Start bei A1.2',
  },
  {
    changedAt: '2026-10-05T08:00:00Z',
    planVersion: 1,
    trigger: 'placement',
    type: 'unit_skipped',
    reason: 'Einheit „Essen & Trinken“ übersprungen: im Test schon sicher (85 %)',
  },
];
