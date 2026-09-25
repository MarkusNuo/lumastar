import { describe, expect, it } from 'vitest';
import type { Curriculum } from '../../api/types';
import { buildLearningPath } from './learningPath';

const CURRICULUM: Curriculum = {
  stages: [
    {
      level: 'A0',
      title: 'Erste Schritte',
      units: [
        { id: 'a0_u01_sounds', title: 'Laute', hasContent: false, skillTags: [], color: 'teal' },
      ],
    },
    {
      level: 'A1.1',
      title: 'Erste Gespräche',
      units: [
        {
          id: 'a1_u01_greetings',
          title: 'Begrüssung & Höflichkeit',
          description: 'Grüssen, sich verabschieden, bitte und danke sagen.',
          hasContent: true,
          skillTags: ['vocab.greetings'],
          color: 'violet',
          estimatedLessons: 4,
        },
        {
          id: 'a1_u02_family',
          title: 'Familie',
          hasContent: true,
          skillTags: [],
          color: 'rose',
          estimatedLessons: 12,
        },
      ],
    },
  ],
};

describe('buildLearningPath', () => {
  const path = buildLearningPath(CURRICULUM);
  const [a0, a1] = path;

  it('keeps the stages and units in curriculum order', () => {
    expect(path.map((stage) => stage.level)).toEqual(['A0', 'A1.1']);
    expect(a1?.units.map((unit) => unit.id)).toEqual(['a1_u01_greetings', 'a1_u02_family']);
  });

  it('locks every lesson of a unit without exercises', () => {
    expect(a0?.units[0]).toMatchObject({ playable: false, color: 'teal' });
    expect(a0?.units[0]?.nodes.every((node) => node.status === 'locked')).toBe(true);
  });

  it('makes the first lesson of the first playable unit the current one', () => {
    const greetings = a1?.units[0];

    expect(greetings?.nodes.map((node) => node.status)).toEqual([
      'current',
      'available',
      'available',
      'available',
    ]);
    expect(a1?.units[1]?.nodes.every((node) => node.status === 'available')).toBe(true);
  });

  it('numbers units per stage and lessons per unit, and caps the number of lessons', () => {
    expect(a1?.units[1]?.eyebrow).toBe('A1.1 · Einheit 2');
    expect(a1?.units[0]?.nodes[2]?.label).toBe('Lektion 3');
    expect(a1?.units[1]?.nodes).toHaveLength(5);
    expect(a0?.units[0]?.nodes).toHaveLength(3);
  });
});
