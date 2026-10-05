import { describe, expect, it } from 'vitest';
import { SAMPLE_PATH } from '../plan/samplePlan';
import { buildLearningPath, FOCUS_COLOR } from './learningPath';

describe('buildLearningPath', () => {
  const stages = buildLearningPath(SAMPLE_PATH);
  const [a12] = stages;
  const unit = (id: string) => stages.flatMap((stage) => stage.units).find((u) => u.id === id);
  const statuses = (id: string) => unit(id)?.nodes.map((node) => node.status);

  it('keeps the stages and units of the plan in order', () => {
    expect(stages.map((stage) => stage.level)).toEqual(['A1.2', 'A1.3', 'A2.1', 'B1.1', 'C2.3']);
    expect(a12?.units.map((u) => u.id)).toEqual([
      'a1_u05_food_drink',
      'a1_u06_home',
      'focus_grammar_definite_article',
      'a1_u07_definite_article',
    ]);
  });

  it('shows one node per planned lesson, completed ones first, then the pulsing current one', () => {
    expect(statuses('a1_u06_home')).toEqual(['completed', 'completed', 'current', 'locked']);
  });

  it('locks the lessons of the units after the current one', () => {
    expect(statuses('a1_u07_definite_article')?.every((status) => status === 'locked')).toBe(true);
    expect(unit('a1_u07_definite_article')?.playable).toBe(true);
  });

  it('marks skipped units but keeps their lessons startable', () => {
    expect(unit('a1_u05_food_drink')).toMatchObject({
      badge: 'skipped',
      reason: 'Im Einstufungstest schon sicher (85 %)',
    });
    expect(statuses('a1_u05_food_drink')?.every((status) => status === 'available')).toBe(true);
  });

  it('marks units without exercises as coming soon and locks them', () => {
    expect(unit('b1_u01_imperfect')).toMatchObject({ badge: 'comingSoon', playable: false });
    expect(statuses('b1_u01_imperfect')?.every((status) => status === 'locked')).toBe(true);
  });

  it('gives focus units the target nodes, the focus colour and their reason', () => {
    const focus = unit('focus_grammar_definite_article');

    expect(focus).toMatchObject({
      focus: true,
      color: FOCUS_COLOR,
      eyebrow: 'Fokus-Lektion',
      reason: 'Fehlerquote 45 % bei Bestimmter Artikel',
    });
    expect(focus?.nodes.map((node) => [node.kind, node.label])).toEqual([
      ['focus', 'Fokus-Lektion 1'],
      ['focus', 'Fokus-Lektion 2'],
    ]);
  });

  it('numbers the curriculum units per stage, without the focus units', () => {
    expect(a12?.units.map((u) => u.eyebrow)).toEqual([
      'A1.2 · Einheit 1',
      'A1.2 · Einheit 2',
      'Fokus-Lektion',
      'A1.2 · Einheit 3',
    ]);
  });

  it('ends every stage with its checkpoint, locked until checkpoints arrive', () => {
    expect(a12?.checkpoint).toEqual({
      id: 'checkpoint-A1.2',
      status: 'locked',
      label: 'Checkpoint A1.2',
      color: 'indigo',
    });
  });

  it('marks every lesson of a completed unit as done', () => {
    const [stage] = buildLearningPath({
      ...SAMPLE_PATH,
      stages: [
        {
          level: 'A1.1',
          title: 'Erste Gespräche',
          checkpoint: { status: 'passed' },
          units: [
            {
              unitId: 'a1_u01_greetings',
              title: 'Begrüssung & Höflichkeit',
              status: 'completed',
              estimatedLessons: 3,
              lessonsCompleted: 3,
              focus: false,
              hasContent: true,
            },
          ],
        },
      ],
    });

    expect(stage?.units[0]?.nodes.map((node) => node.status)).toEqual([
      'completed',
      'completed',
      'completed',
    ]);
    expect(stage?.checkpoint.status).toBe('completed');
  });
});
