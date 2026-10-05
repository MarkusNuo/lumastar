import { expect, type APIRequestContext } from '@playwright/test';
import { playViaApi, type CheckpointResult } from './lessonApi.ts';
import { currentUnit, fetchPath, openFocusUnits, stageOf } from './planApi.ts';

/*
 * Moving the learner along the plan through the API, every answer right, for tests whose subject is
 * what comes after (a focus lesson, a checkpoint, a level badge): repeating lessons in the UI would
 * add nothing but time.
 */

/** Far above the largest stage of the content (21 lessons); focus units add one lesson each. */
const MAX_LESSONS_PER_STAGE = 40;

/** Plays lessons of the unit in progress until the checkpoint of the stage opens; returns their number. */
export async function completeStageViaApi(request: APIRequestContext, level: string): Promise<number> {
  for (let played = 0; ; played += 1) {
    const path = await fetchPath(request);
    if (stageOf(path, level).checkpoint.status !== 'locked') return played;
    expect(played, `the units of ${level} are done within a bounded number of lessons`).toBeLessThan(
      MAX_LESSONS_PER_STAGE,
    );
    await playViaApi(request, { unitId: currentUnit(path).unitId });
  }
}

/** Passes the open checkpoint of a stage. */
export async function passCheckpointViaApi(
  request: APIRequestContext,
  level: string,
): Promise<CheckpointResult> {
  const { result } = await playViaApi(request, { checkpoint: level });
  expect(result.checkpoint, `checkpoint ${level}`).toMatchObject({ level, passed: true });
  return result.checkpoint as CheckpointResult;
}

/**
 * Plays every focus unit the plan holds open (one focus lesson each), e.g. one a weak skill tag got
 * at the last revision, so that the next lesson of the path is a lesson of a curriculum unit again.
 */
export async function finishOpenFocusUnits(request: APIRequestContext): Promise<number> {
  for (let played = 0; ; played += 1) {
    const [focus] = openFocusUnits(await fetchPath(request));
    if (!focus) return played;
    expect(played, 'the plan holds at most two focus units open').toBeLessThan(4);
    await playViaApi(request, { unitId: focus.unitId });
  }
}
