import { describe, expect, it } from 'vitest';
import type { PlacementItem } from '../../api/types';
import { jsonResponse, stubApi } from '../../test/http';
import { answerPlacementItem, startPlacement, toPlacementExercise } from './placementApi';
import {
  SAMPLE_PLACEMENT_CHOICE,
  SAMPLE_PLACEMENT_FREE,
  SAMPLE_PLACEMENT_GAP,
  SAMPLE_PLACEMENT_WORD_ORDER,
  SAMPLE_PLACEMENT_WORDBANK,
} from './samplePlacement';

describe('toPlacementExercise', () => {
  it('maps every placement type onto the exercise of the lesson player, without solutions', () => {
    expect(toPlacementExercise(SAMPLE_PLACEMENT_CHOICE)).toEqual({
      id: 'pl_a0_001',
      type: 'multiple_choice',
      prompt: { lang: 'de', text: 'Was bedeutet „mirëdita“?' },
      reviewed: false,
      explanation: '',
      choices: ['Gute Nacht', 'Guten Tag', 'Auf Wiedersehen', 'Danke'],
      solutions: [],
    });
    expect(toPlacementExercise(SAMPLE_PLACEMENT_GAP)).toMatchObject({
      type: 'fill_gap',
      text: '___ jam Arta.',
      choices: ['Ai', 'Unë', 'Ti', 'Ajo'],
      solutions: [],
      standardForms: [],
    });
    expect(toPlacementExercise(SAMPLE_PLACEMENT_FREE)).toMatchObject({
      type: 'translate_free',
      answerLang: 'sq',
      solutions: [],
    });
    expect(toPlacementExercise(SAMPLE_PLACEMENT_WORDBANK)).toMatchObject({
      type: 'translate_wordbank',
      wordBank: ['mirëdita', 'faleminderit', 'Po', 'jo'],
    });
    expect(toPlacementExercise(SAMPLE_PLACEMENT_WORD_ORDER)).toMatchObject({
      type: 'word_order',
      tokens: ['pi', 'Unë', 'kafe', 'nuk'],
    });
  });

  it('rejects items that lack the fields of their type or have a type the test never uses', () => {
    const broken: PlacementItem = { ...SAMPLE_PLACEMENT_CHOICE, choices: undefined };

    expect(() => toPlacementExercise(broken)).toThrow('lacks choices');
    expect(() => toPlacementExercise({ ...SAMPLE_PLACEMENT_CHOICE, type: 'match_pairs' })).toThrow(
      'not supported',
    );
  });
});

describe('placement requests', () => {
  it('starts a test with its first item and position', async () => {
    stubApi({
      'POST /api/placement': () =>
        jsonResponse(
          {
            testId: 't-1',
            maxItems: 20,
            position: 1,
            startLevel: 'A1.1',
            item: SAMPLE_PLACEMENT_CHOICE,
          },
          201,
        ),
    });

    await expect(startPlacement()).resolves.toMatchObject({
      testId: 't-1',
      maxItems: 20,
      position: 1,
      exercise: { id: 'pl_a0_001', type: 'multiple_choice' },
    });
  });

  it('sends the answer like a lesson answer and returns the next item or the end', async () => {
    let answers = 0;
    const requests = stubApi({
      'POST /api/placement/t-1/answers': () =>
        jsonResponse(
          ++answers === 1
            ? { finished: false, position: 2, nextItem: SAMPLE_PLACEMENT_GAP }
            : { finished: true, position: 2 },
        ),
    });

    await expect(
      answerPlacementItem('t-1', 'pl_a0_001', { kind: 'choice', choice: 'Guten Tag' }, 3200),
    ).resolves.toMatchObject({
      finished: false,
      next: { position: 2, exercise: { id: 'pl_a0_004' } },
    });
    await expect(
      answerPlacementItem('t-1', 'pl_a0_004', { kind: 'choice', choice: 'Unë' }, 2100),
    ).resolves.toEqual({ finished: true });
    expect(await requests[0]?.json()).toEqual({
      exerciseId: 'pl_a0_001',
      answer: { choice: 'Guten Tag' },
      responseTimeMs: 3200,
    });
  });
});
