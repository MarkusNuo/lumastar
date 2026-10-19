import { useEffect, useRef } from 'react';
import { playCue } from '../../lib/effects/playCue';
import type { QueueEntry } from './session/lessonQueue';

/**
 * Sound and vibration once per checked answer: correct, wrong, or the brighter combo
 * chime for a run of correct answers. A later verdict from the backend stays silent.
 */
export function useAnswerCue(entry: QueueEntry | undefined, combo: boolean): void {
  const cuedKey = useRef<number | null>(null);
  const checkedKey = entry?.verdict ? entry.key : null;
  const correct = entry?.verdict?.countsAsCorrect === true;

  useEffect(() => {
    if (checkedKey === null || cuedKey.current === checkedKey) return;
    cuedKey.current = checkedKey;
    if (!correct) playCue('wrong');
    else playCue(combo ? 'combo' : 'correct');
  }, [checkedKey, correct, combo]);
}
