import { describe, expect, it } from 'vitest';
import { SAMPLE_PATH } from './samplePlan';
import { buildPlanTimeline } from './timeline';

describe('buildPlanTimeline', () => {
  const bands = buildPlanTimeline(SAMPLE_PATH);
  const [a1, a2, b1, c2] = bands;

  it('groups the stages of the plan by CEFR band with the expected date of each band', () => {
    expect(bands.map((band) => [band.band, band.day])).toEqual([
      ['A1', '2026-11-16'],
      ['A2', '2027-02-08'],
      ['B1', '2027-06-14'],
      ['C2', '2029-03-05'],
    ]);
    expect(a1?.stages.map((stage) => stage.level)).toEqual(['A1.2', 'A1.3']);
    expect(c2?.stages.map((stage) => stage.level)).toEqual(['C2.3']);
  });

  it('marks the band and stage the learner is at', () => {
    expect(bands.map((band) => band.current)).toEqual([true, false, false, false]);
    expect(a1?.stages.map((stage) => stage.current)).toEqual([true, false]);
  });

  it('counts the lessons a band needs, without skipped units', () => {
    // Zuhause 4 (2 done) + focus 2 + Bestimmter Artikel 5 + Präsens 5; Essen & Trinken is skipped.
    expect(a1).toMatchObject({ lessons: 16, lessonsDone: 2 });
    expect(a2).toMatchObject({ lessons: 5, lessonsDone: 0 });
  });

  it('keeps status, focus, content and reason of every unit', () => {
    expect(a1?.stages[0]?.units.map((unit) => [unit.title, unit.status, unit.focus])).toEqual([
      ['Essen & Trinken', 'skipped', false],
      ['Zuhause', 'in_progress', false],
      ['Bestimmter Artikel üben', 'planned', true],
      ['Bestimmter Artikel', 'planned', false],
    ]);
    expect(a1?.stages[0]?.units[2]?.reason).toBe('Fehlerquote 45 % bei Bestimmter Artikel');
    expect(b1?.stages[0]?.units[0]?.hasContent).toBe(false);
  });

  it('starts a beginner with the A0 band, which has no date', () => {
    const [first] = buildPlanTimeline({
      ...SAMPLE_PATH,
      currentLevel: 'A0',
      stages: [
        {
          level: 'A0',
          title: 'Erste Schritte',
          checkpoint: { status: 'locked' },
          units: [],
        },
        ...SAMPLE_PATH.stages,
      ],
    });

    expect(first).toMatchObject({ band: 'A0', day: undefined, current: true, lessons: 0 });
  });
});
