import { describe, expect, it } from 'vitest';
import { SAMPLE_PATH } from '../plan/samplePlan';
import { buildLearningPath, FOCUS_COLOR, hasPlayableLesson, nextLessonUnit } from './learningPath';

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

  it('opens a planned focus unit at once, because it is extra practice', () => {
    expect(statuses('focus_grammar_definite_article')).toEqual(['available', 'available']);
  });

  it('numbers the curriculum units per stage, without the focus units', () => {
    expect(a12?.units.map((u) => u.eyebrow)).toEqual([
      'A1.2 · Einheit 1',
      'A1.2 · Einheit 2',
      'Fokus-Lektion',
      'A1.2 · Einheit 3',
    ]);
  });

  it('ends every stage with its checkpoint, locked while units of the stage are open', () => {
    expect(a12?.checkpoint).toEqual({
      id: 'checkpoint-A1.2',
      level: 'A1.2',
      nextLevel: 'A1.3',
      exerciseCount: 15,
      requiredAccuracy: 0.8,
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
          checkpoint: { status: 'passed', exerciseCount: 15, requiredAccuracy: 0.8 },
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

describe('buildLearningPath with an open checkpoint', () => {
  const [first, second] = SAMPLE_PATH.stages;
  if (!first || !second) throw new Error('The sample path needs two stages');
  const done = (stage: typeof first) => ({
    ...stage,
    checkpoint: { status: 'available' as const, exerciseCount: 15, requiredAccuracy: 0.8 },
    units: stage.units.map((unit) => ({
      ...unit,
      status: 'completed' as const,
      lessonsCompleted: unit.estimatedLessons,
    })),
  });
  const inProgress = {
    ...second,
    units: second.units.map((unit, index) => ({
      ...unit,
      status: index === 0 ? ('in_progress' as const) : ('planned' as const),
      lessonsCompleted: 0,
      hasContent: true,
    })),
  };

  it('makes an open checkpoint before the next lesson the next step', () => {
    const [stage, next] = buildLearningPath({ ...SAMPLE_PATH, stages: [done(first), inProgress] });

    expect(stage?.checkpoint.status).toBe('current');
    const nodes = next?.units.flatMap((unit) => unit.nodes.map((node) => node.status)) ?? [];
    expect(nodes).not.toContain('current');
    expect(nodes[0], 'the lesson stays playable').toBe('available');
  });

  it('keeps the checkpoint open but not current when the next lesson comes first', () => {
    const [stage, later] = buildLearningPath({
      ...SAMPLE_PATH,
      stages: [first, done(second)],
    });

    expect(later?.checkpoint.status).toBe('available');
    expect(stage?.units.some((unit) => unit.nodes.some((node) => node.status === 'current'))).toBe(
      true,
    );
  });

  it('lets an open checkpoint go before a focus lesson and keeps the colour of the stage', () => {
    const stage = done(first);
    const lastUnit = stage.units.filter((unit) => !unit.focus).at(-1);
    const withFocusLast = {
      ...stage,
      units: [
        ...stage.units.filter((unit) => !unit.focus),
        {
          unitId: 'focus_spelling.alphabet_1',
          title: 'Fokus: Alphabet & Aussprache',
          status: 'in_progress' as const,
          estimatedLessons: 1,
          lessonsCompleted: 0,
          focus: true,
          hasContent: true,
          reason: '3 Fehler in einer Lektion bei Alphabet & Aussprache',
        },
      ],
    };
    const [built] = buildLearningPath({ ...SAMPLE_PATH, stages: [withFocusLast, second] });

    expect(built?.checkpoint).toMatchObject({ status: 'current', color: lastUnit?.color });
    expect(built?.units.at(-1)?.nodes.map((node) => node.status)).toEqual(['available']);
  });

  it('names no next level after the last stage', () => {
    const stages = buildLearningPath(SAMPLE_PATH);

    expect(stages.at(-1)?.checkpoint).toMatchObject({ level: 'C2.3', nextLevel: undefined });
  });
});

describe('hasPlayableLesson', () => {
  it('is true while a lesson can be started and false when no unit has exercises yet', () => {
    expect(hasPlayableLesson(buildLearningPath(SAMPLE_PATH))).toBe(true);

    const skeleton = SAMPLE_PATH.stages.filter((stage) =>
      stage.units.every((unit) => !unit.hasContent),
    );
    expect(skeleton.map((stage) => stage.level)).toEqual(['B1.1', 'C2.3']);
    expect(
      hasPlayableLesson(
        buildLearningPath({ ...SAMPLE_PATH, currentLevel: 'B1.1', stages: skeleton }),
      ),
    ).toBe(false);
  });
});

describe('nextLessonUnit', () => {
  it('names the unit of the pulsing lesson', () => {
    expect(nextLessonUnit(buildLearningPath(SAMPLE_PATH))).toBe('a1_u06_home');
  });

  it('names none while an open checkpoint is the next step', () => {
    const stages = buildLearningPath(SAMPLE_PATH).map((stage, index) => ({
      ...stage,
      checkpoint: {
        ...stage.checkpoint,
        status: index === 0 ? ('current' as const) : ('locked' as const),
      },
      units: stage.units.map((unit) => ({
        ...unit,
        nodes: unit.nodes.map((node) => ({ ...node, status: 'available' as const })),
      })),
    }));

    expect(nextLessonUnit(stages)).toBeUndefined();
  });
});
