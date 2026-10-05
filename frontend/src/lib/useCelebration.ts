import { celebrate } from './celebrate';
import type { FeedbackCue } from './effects/cue';
import { playCue } from './effects/playCue';
import { useOnceWhen } from './useOnceWhen';

/** Confetti and the cue's sound and vibration, once, as soon as `ready` turns true. */
export function useCelebration(ready: boolean, cue: FeedbackCue): void {
  useOnceWhen(ready, () => {
    celebrate();
    playCue(cue);
  });
}
